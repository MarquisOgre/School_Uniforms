import { useEffect, useRef, useState } from 'react'
import { MessageCircle, Send, X } from 'lucide-react'
import { supabase } from './lib/supabase'

type ChatWidgetProps = {
  schoolId?: string
  branchId?: string
}

type Message = {
  id: string
  sender_user_id: string | null
  message: string
  created_at: string
}

export default function ChatWidget({ schoolId, branchId }: ChatWidgetProps) {
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
    if (!open || !authenticated || !schoolId || !branchId || !supabase) return
    let cancelled = false
    const client = supabase as any

    async function load() {
      setLoading(true)
      setError('')
      const { data: userData } = await client.auth.getUser()
      const user = userData?.user
      if (!user) {
        setLoading(false)
        return
      }

      let { data: conversations, error: conversationError } = await client
        .from('support_conversations')
        .select('id,status,updated_at')
        .eq('customer_user_id', user.id)
        .eq('school_id', schoolId)
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
            school_id: schoolId,
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
  }, [open, authenticated, schoolId, branchId])

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
    if (!text || !conversationId || !supabase || sending) return
    setSending(true)
    const { data } = await (supabase as any).auth.getUser()
    const user = data?.user
    if (!user) {
      setError('Please sign in to use chat.')
      setSending(false)
      return
    }
    const { error: sendError } = await (supabase as any).from('support_messages').insert({
      conversation_id: conversationId,
      sender_user_id: user.id,
      message: text,
    })
    if (sendError) setError(sendError.message)
    else setDraft('')
    setSending(false)
  }

  return (
    <>
      <button className="floating-chat-button" onClick={() => setOpen(true)}>
        <MessageCircle size={22} />
        <span>Chat with us</span>
      </button>

      {open ? (
        <div className="chat-widget">
          <div className="chat-widget-header">
            <div>
              <strong>Chat with us</strong>
              <span>{authenticated ? 'Support team' : 'School Uniform Support'}</span>
            </div>
            <button onClick={() => setOpen(false)} aria-label="Close chat">
              <X size={19} />
            </button>
          </div>

          {!authenticated ? (
            <div className="chat-login-prompt">
              <MessageCircle size={34} />
              <h3>Need help?</h3>
              <p>Please log in as Parent / Student to start a support chat with our team.</p>
              <button
                onClick={() => {
                  setOpen(false)
                  window.dispatchEvent(new CustomEvent('open-parent-login'))
                }}
              >
                Parent / Student Login
              </button>
            </div>
          ) : !schoolId || !branchId ? (
            <div className="chat-login-prompt">
              <MessageCircle size={34} />
              <p>Your school store is not selected yet. Open your school store to start chatting with support.</p>
            </div>
          ) : (
            <>
              <div className="chat-messages">
                {loading ? <div className="chat-status">Loading chat...</div> : null}
                {!loading && !messages.length ? (
                  <div className="chat-status">Send us a message and our support team will reply here.</div>
                ) : null}
                {messages.map((item) => (
                  <div
                    key={item.id}
                    className={
                      'chat-message ' +
                      (item.sender_user_id === currentUserId ? 'customer-message' : 'support-message')
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
                  placeholder="Type your message..."
                  maxLength={1000}
                />
                <button type="submit" disabled={!draft.trim() || sending} aria-label="Send message">
                  <Send size={17} />
                </button>
              </form>
            </>
          )}
        </div>
      ) : null}
    </>
  )
}
