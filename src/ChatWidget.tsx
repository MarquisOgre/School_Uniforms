import { useEffect, useRef, useState } from 'react'
import { MessageCircle, Send, X, Sparkles } from 'lucide-react'
import { supabase } from './lib/supabase'

type ChatWidgetProps = {
  branchId?: string
  studentId?: string
}

type Message = {
  id: string
  sender_user_id: string | null
  message: string
  created_at: string
}

type ApiMessage = {
  role: 'user' | 'assistant'
  content: string
}

export default function ChatWidget({ branchId, studentId }: ChatWidgetProps) {
  const [open, setOpen] = useState(false)
  const [authenticated, setAuthenticated] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [draft, setDraft] = useState('')
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const endRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!supabase) return
    let active = true
    void (supabase as any).auth.getUser().then(({ data }: any) => {
      if (active) {
        setAuthenticated(Boolean(data?.user))
        setCurrentUserId(data?.user?.id ?? null)
      }
    })
    const { data } = (supabase as any).auth.onAuthStateChange((_event: string, session: any) => {
      setAuthenticated(Boolean(session?.user))
      setCurrentUserId(session?.user?.id ?? null)
      if (!session?.user) {
        setConversationId(null)
        setMessages([])
      }
    })
    return () => {
      active = false
      data?.subscription?.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!open || !supabase) return
    let cancelled = false
    const client = supabase as any

    async function load() {
      setLoading(true)
      setError('')

      // A visitor can use AI chat without a branch. Persistent conversations
      // require both an authenticated customer and a selected branch.
      const { data: userData } = await client.auth.getUser()
      const user = userData?.user
      if (!user || !branchId) {
        setConversationId(null)
        setMessages([])
        setLoading(false)
        return
      }

      const { data: conversations, error: conversationError } = await client
        .from('support_conversations')
        .select('id,status,updated_at')
        .eq('customer_user_id', user.id)
        .eq('branch_id', branchId)
        .neq('status', 'closed')
        .order('updated_at', { ascending: false })
        .limit(1)

      if (conversationError) {
        if (!cancelled) setError(conversationError.message)
        setLoading(false)
        return
      }

      let conversation = conversations?.[0]
      if (!conversation) {
        const created = await client
          .from('support_conversations')
          .insert({
            customer_user_id: user.id,
            branch_id: branchId,
            status: 'open',
          })
          .select('id,status,updated_at')
          .single()
        if (created.error) {
          if (!cancelled) setError(created.error.message)
          setLoading(false)
          return
        }
        conversation = created.data
      }

      const { data: rows, error: messageError } = await client
        .from('support_messages')
        .select('id,sender_user_id,message,created_at')
        .eq('conversation_id', conversation.id)
        .order('created_at')

      if (!cancelled) {
        setConversationId(conversation.id)
        setMessages(rows ?? [])
        if (messageError) setError(messageError.message)
        setLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [open, authenticated, branchId])

  useEffect(() => {
    if (!conversationId || !supabase) return
    const client = supabase as any
    const channel = client
      .channel('support-chat-' + conversationId)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'support_messages',
          filter: 'conversation_id=eq.' + conversationId,
        },
        (payload: any) => {
          setMessages((current) =>
            current.some((x) => x.id === payload.new.id) ? current : [...current, payload.new],
          )
        },
      )
      .subscribe()
    return () => {
      void client.removeChannel(channel)
    }
  }, [conversationId])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, open])

  const send = async () => {
    const text = draft.trim()
    if (!text || !supabase || sending) return
    setSending(true)
    setError('')

    const { data: sessionData } = await (supabase as any).auth.getSession()
    const user = sessionData?.session?.user || null
    const now = new Date().toISOString()
    const customerMessage: Message = {
      id: 'local-' + Date.now(),
      sender_user_id: user?.id ?? 'visitor',
      message: text,
      created_at: now,
    }
    setMessages((current) => [...current, customerMessage])
    setDraft('')

    if (user && branchId && conversationId) {
      const { data: savedCustomerMessage, error: sendError } = await (supabase as any)
        .from('support_messages')
        .insert({
          conversation_id: conversationId,
          sender_user_id: user.id,
          message: text,
        })
        .select('id,sender_user_id,message,created_at')
        .single()

      if (sendError || !savedCustomerMessage) {
        setMessages((current) => current.filter((item) => item.id !== customerMessage.id))
        setError(sendError?.message || 'Unable to save your message.')
        setSending(false)
        return
      }

      // Replace the optimistic message with the persisted row. The realtime
      // listener will see the same database id and will not add it again.
      setMessages((current) =>
        current.map((item) => (item.id === customerMessage.id ? savedCustomerMessage : item)),
      )
    }

    const history: ApiMessage[] = [...messages, customerMessage].slice(-8).map((item) => ({
      role: item.sender_user_id === (user?.id ?? 'visitor') ? 'user' : 'assistant',
      content: item.message,
    }))

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
      const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined
      if (!supabaseUrl || !supabaseKey) throw new Error('Chat service is not configured.')

      const headers: Record<string, string> = {
        apikey: supabaseKey,
        'Content-Type': 'application/json',
      }
      if (sessionData?.session?.access_token) {
        headers.Authorization = `Bearer ${sessionData.session.access_token}`
      }

      const response = await fetch(`${supabaseUrl}/functions/v1/ai-support-chat`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          conversationId,
          branchId,
          studentId,
          message: text,
          history,
        }),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result?.error || 'AI support is temporarily unavailable.')

      const aiText = typeof result?.reply === 'string' ? result.reply.trim() : ''
      if (!aiText) throw new Error('The AI returned an empty response.')

      const aiMessage: Message = {
        id: 'ai-' + Date.now(),
        sender_user_id: null,
        message: aiText,
        created_at: new Date().toISOString(),
      }
      if (user && branchId && conversationId) {
        const { data: savedAiMessage, error: aiInsertError } = await (supabase as any)
          .from('support_messages')
          .insert({
            conversation_id: conversationId,
            sender_user_id: null,
            message: aiText,
          })
          .select('id,sender_user_id,message,created_at')
          .single()

        if (aiInsertError || !savedAiMessage) {
          throw new Error(aiInsertError?.message || 'Unable to save the AI response.')
        }

        // Add the persisted response once. The realtime listener receives the
        // same id and ignores it.
        setMessages((current) => [...current, savedAiMessage])
      } else {
        // Visitors do not persist messages, so add the AI response locally.
        setMessages((current) => [...current, aiMessage])
      }
    } catch (err) {
      setMessages((current) => current.filter((item) => item.id !== customerMessage.id))
      setError(err instanceof Error ? err.message : 'Unable to contact AI support.')
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      <button className="floating-chat-button" onClick={() => setOpen(true)} aria-label="Open chat">
        <MessageCircle size={22} />
        <span>Chat with us</span>
      </button>

      {open ? (
        <div className="chat-widget">
          <div className="chat-widget-header">
            <div>
              <strong>Chat with us</strong>
              <span>AI Support Assistant</span>
            </div>
            <button onClick={() => setOpen(false)} aria-label="Close chat">
              <X size={19} />
            </button>
          </div>

          <div className="chat-ai-intro">
                <Sparkles size={16} />
                <span>AI assistant is ready. Ask about uniforms, products, orders, shipping or returns.</span>
              </div>

              <div className="chat-messages">
                {loading ? <div className="chat-status">Loading chat...</div> : null}
                {!loading && !messages.length ? (
                  <div className="chat-status">
                    <strong>Hi! 👋</strong>
                    <br />
                    How can I help you today?
                  </div>
                ) : null}

                {messages.map((item) => (
                  <div
                    key={item.id}
                    className={
                      'chat-message ' +
                      ((currentUserId && item.sender_user_id === currentUserId) ||
                      (!currentUserId && item.sender_user_id === 'visitor')
                        ? 'customer-message'
                        : 'support-message')
                    }
                  >
                    <p>{item.message}</p>
                    <time>
                      {new Date(item.created_at).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </time>
                  </div>
                ))}

                {sending ? (
                  <div className="chat-message support-message">
                    <p>Thinking...</p>
                  </div>
                ) : null}
                <div ref={endRef} />
              </div>

              {error ? <div className="chat-error">{error}</div> : null}

              <form
                className="chat-composer"
                onSubmit={(e) => {
                  e.preventDefault()
                  void send()
                }}
              >
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Ask our AI assistant..."
                  maxLength={1000}
                  disabled={sending}
                />
                <button type="submit" disabled={!draft.trim() || sending} aria-label="Send message">
                  <Send size={17} />
                </button>
              </form>
        </div>
      ) : null}
    </>
  )
}
