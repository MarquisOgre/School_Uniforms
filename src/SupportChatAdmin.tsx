import { useEffect, useRef, useState } from 'react'
import { MessageCircle, Send } from 'lucide-react'
import { supabase } from './lib/supabase'

type Conversation = {
  id: string
  customer_user_id: string | null
  status: string
  updated_at: string
  customer_name?: string
}

type Message = {
  id: string
  sender_user_id: string | null
  message: string
  created_at: string
}

export default function SupportChatAdmin() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [draft, setDraft] = useState('')
  const [adminId, setAdminId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const endRef = useRef<HTMLDivElement | null>(null)

  const loadConversations = async () => {
    if (!supabase) return
    const client = supabase as any
    const { data: auth } = await client.auth.getUser()
    if (auth?.user) setAdminId(auth.user.id)

    const { data, error: conversationError } = await client
      .from('support_conversations')
      .select('id,customer_user_id,status,updated_at')
      .order('updated_at', { ascending: false })

    if (conversationError) {
      setError(conversationError.message)
      setLoading(false)
      return
    }

    const rows = (data ?? []) as Conversation[]
    const ids = [...new Set(rows.map((x) => x.customer_user_id).filter(Boolean))]
    let names: Record<string, string> = {}
    if (ids.length) {
      const { data: profiles } = await client.from('profiles').select('id,full_name,login_id').in('id', ids)
      names = Object.fromEntries(
        (profiles ?? []).map((x: any) => [x.id, x.full_name || x.login_id || 'Customer']),
      )
    }

    const mapped = rows.map((x) => ({
      ...x,
      customer_name: x.customer_user_id ? names[x.customer_user_id] || 'Customer' : 'Customer',
    }))
    setConversations(mapped)
    if (!selected && mapped.length) setSelected(mapped[0].id)
    setLoading(false)
  }

  const loadMessages = async (conversationId: string) => {
    if (!supabase) return
    const { data, error: messageError } = await (supabase as any)
      .from('support_messages')
      .select('id,sender_user_id,message,created_at')
      .eq('conversation_id', conversationId)
      .order('created_at')
    if (messageError) setError(messageError.message)
    setMessages(data ?? [])
  }

  useEffect(() => {
    void loadConversations()
  }, [])

  useEffect(() => {
    if (!selected) {
      setMessages([])
      return
    }
    void loadMessages(selected)
    if (!supabase) return
    const client = supabase as any
    const channel = client
      .channel('admin-support-' + selected)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'support_messages',
          filter: 'conversation_id=eq.' + selected,
        },
        (payload: any) => {
          setMessages((current) =>
            current.some((x) => x.id === payload.new.id) ? current : [...current, payload.new],
          )
          void loadConversations()
        },
      )
      .subscribe()

    return () => {
      void client.removeChannel(channel)
    }
  }, [selected])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = async () => {
    const text = draft.trim()
    if (!text || !selected || !adminId || !supabase) return
    const { error: sendError } = await (supabase as any).from('support_messages').insert({
      conversation_id: selected,
      sender_user_id: adminId,
      message: text,
    })
    if (sendError) setError(sendError.message)
    else setDraft('')
  }

  return (
    <div className="admin-support-chat">
      <div className="admin-support-header">
        <div>
          <p className="eyebrow">CUSTOMER SUPPORT</p>
          <h1>Support Chat</h1>
          <p>Reply to Parent / Student support conversations in real time.</p>
        </div>
        <MessageCircle size={32} />
      </div>

      {error ? <div className="workspace-error">{error}</div> : null}

      <div className="admin-support-layout">
        <aside className="admin-support-conversations">
          <div className="admin-support-list-title">Conversations</div>
          {loading ? (
            <div className="admin-support-empty">Loading...</div>
          ) : conversations.length ? (
            conversations.map((conversation) => (
              <button
                key={conversation.id}
                className={selected === conversation.id ? 'active' : ''}
                onClick={() => setSelected(conversation.id)}
              >
                <strong>{conversation.customer_name}</strong>
                <span>{conversation.status}</span>
              </button>
            ))
          ) : (
            <div className="admin-support-empty">No support conversations yet.</div>
          )}
        </aside>

        <section className="admin-support-thread">
          {selected ? (
            <>
              <div className="admin-support-thread-head">
                <strong>
                  {conversations.find((x) => x.id === selected)?.customer_name || 'Customer'}
                </strong>
                <span>Support conversation</span>
              </div>
              <div className="admin-support-messages">
                {messages.map((item) => (
                  <div
                    key={item.id}
                    className={
                      item.sender_user_id === adminId
                        ? 'admin-support-message admin-support-message-admin'
                        : 'admin-support-message'
                    }
                  >
                    <p>{item.message}</p>
                    <time>
                      {new Date(item.created_at).toLocaleString([], {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </time>
                  </div>
                ))}
                <div ref={endRef} />
              </div>
              <form
                className="admin-support-composer"
                onSubmit={(e) => {
                  e.preventDefault()
                  void send()
                }}
              >
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Reply to customer..."
                  maxLength={1000}
                />
                <button type="submit" disabled={!draft.trim()}>
                  <Send size={17} />
                </button>
              </form>
            </>
          ) : (
            <div className="admin-support-empty">Select a conversation to start.</div>
          )}
        </section>
      </div>
    </div>
  )
}
