"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import ReactMarkdown from "react-markdown"
import { PenSquare, Search, ArrowUp, ChevronDown, User, Menu, X } from "lucide-react"
import { cn } from "@/lib/utils"

interface Message {
  role: "user" | "assistant"
  content: string
  timestamp?: string
}

interface Conversation {
  conversation_id: string
  message_count: number
  created_at: string
  last_updated: string
  first_message?: string
}

interface ChatResponse {
  message: string
  conversation_id: string
  tokens_used: number
  total_messages: number
}

const API_BASE_URL = "http://localhost:8000"

export default function ChatApp() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [filteredConversations, setFilteredConversations] = useState<Conversation[]>([])
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [inputMessage, setInputMessage] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Load conversations on mount
  useEffect(() => {
    loadConversations()
  }, [])

  // Filter conversations based on search query
  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredConversations(conversations)
    } else {
      const filtered = conversations.filter((conversation) =>
        getConversationTitle(conversation).toLowerCase().includes(searchQuery.toLowerCase()),
      )
      setFilteredConversations(filtered)
    }
  }, [conversations, searchQuery])

  const loadConversations = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/conversations`)
      if (response.ok) {
        const data = await response.json()
        const conversations = data.conversations || []
        
        // For each conversation, fetch the first message to use as title
        const conversationsWithTitles = await Promise.all(
          conversations.map(async (conversation: Conversation) => {
            try {
              const messagesResponse = await fetch(`${API_BASE_URL}/conversations/${conversation.conversation_id}`)
              if (messagesResponse.ok) {
                const messagesData = await messagesResponse.json()
                const messages = messagesData.messages || []
                const firstUserMessage = messages.find((msg: Message) => msg.role === "user")
                return {
                  ...conversation,
                  first_message: firstUserMessage?.content || undefined
                }
              }
              return conversation
            } catch (error) {
              console.error(`Failed to load messages for conversation ${conversation.conversation_id}:`, error)
              return conversation
            }
          })
        )
        
        setConversations(conversationsWithTitles)
      }
    } catch (error) {
      console.error("Failed to load conversations:", error)
    }
  }

  const loadConversation = async (conversationId: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/conversations/${conversationId}`)
      if (response.ok) {
        const data = await response.json()
        setMessages(data.messages || [])
        setCurrentConversationId(conversationId)
      }
    } catch (error) {
      console.error("Failed to load conversation:", error)
    }
  }

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return

    const userMessage = inputMessage.trim()
    setInputMessage("")
    setIsLoading(true)

    // If this is the first message, trigger transition
    if (messages.length === 0) {
      setIsTransitioning(true)
    }

    // Add user message to UI immediately
    const newUserMessage: Message = {
      role: "user",
      content: userMessage,
      timestamp: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, newUserMessage])

    try {
      const response = await fetch(`${API_BASE_URL}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: userMessage,
          conversation_id: currentConversationId,
        }),
      })

      if (response.ok) {
        const data: ChatResponse = await response.json()

        // Add assistant message
        const assistantMessage: Message = {
          role: "assistant",
          content: data.message,
          timestamp: new Date().toISOString(),
        }

        setMessages((prev) => [...prev, assistantMessage])
        setCurrentConversationId(data.conversation_id)

        // Reload conversations to update the list
        loadConversations()
      } else {
        throw new Error("Failed to send message")
      }
    } catch (error) {
      console.error("Error sending message:", error)
      // Remove the user message if there was an error
      setMessages((prev) => prev.slice(0, -1))
    } finally {
      setIsLoading(false)
      setIsTransitioning(false)
    }
  }

  const startNewConversation = () => {
    setCurrentConversationId(null)
    setMessages([])
    setIsTransitioning(false)
  }

  const getConversationTitle = (conversation: Conversation) => {
    if (conversation.first_message) {
      // Truncate the first message to a reasonable length for the title
      const maxLength = 50
      return conversation.first_message.length > maxLength 
        ? conversation.first_message.substring(0, maxLength) + "..."
        : conversation.first_message
    }
    
    // Fallback to a default title if no first message is available
    return "New Chat"
  }

  const isNewChat = !currentConversationId && messages.length === 0 && !isTransitioning

  return (
    <div className="flex h-screen bg-white">
      {/* Sidebar */}
      <div
        className={cn(
          "bg-[#171717] text-white flex flex-col transition-all duration-300 ease-in-out",
          sidebarOpen ? "w-64" : "w-0 overflow-hidden",
        )}
      >
        {/* Header */}
        <div className="p-3">
          <Button
            onClick={startNewConversation}
            className="w-full bg-transparent hover:bg-white/10 text-white border-white/20 border rounded-lg h-11 justify-start text-sm font-medium"
            variant="outline"
          >
            <PenSquare className="w-4 h-4 mr-3" />
            New chat
          </Button>
        </div>

        {/* Search */}
        <div className="px-3 mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/50" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search chats"
              className="w-full bg-white/10 border-white/20 text-white placeholder:text-white/50 pl-10 h-10 rounded-lg focus:bg-white/20 focus:border-white/30"
            />
          </div>
        </div>

        {/* Conversations */}
        <div className="flex-1 px-3 flex flex-col min-h-0">
          <div className="text-xs text-white/50 font-medium mb-2 px-2">Chats</div>
          <ScrollArea className="flex-1 h-0 min-h-0">
            <div className="space-y-1">
              {filteredConversations.map((conversation) => (
                <Button
                  key={conversation.conversation_id}
                  variant="ghost"
                  className={cn(
                    "w-full justify-start text-left h-auto p-2 text-white/70 hover:bg-white/10 rounded-lg",
                    currentConversationId === conversation.conversation_id && "bg-white/10 text-white",
                  )}
                  onClick={() => loadConversation(conversation.conversation_id)}
                >
                  <div className="truncate text-sm">{getConversationTitle(conversation)}</div>
                </Button>
              ))}
              {filteredConversations.length === 0 && searchQuery && (
                <div className="text-white/50 text-sm p-2">No chats found</div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Bottom */}
        <div className="p-3 border-t border-white/10">
          <Button variant="ghost" className="w-full justify-start text-white/70 hover:bg-white/10 h-10">
            <div className="w-6 h-6 bg-gradient-to-br from-purple-500 to-blue-500 rounded mr-3 flex items-center justify-center text-xs font-bold">
              U
            </div>
            Upgrade plan
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="h-14 border-b border-gray-200 flex items-center justify-between px-4">
          <div className="flex items-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="mr-3 text-gray-600 hover:text-gray-800"
            >
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
            <h1 className="text-lg font-semibold">ChatGPT</h1>
            <ChevronDown className="w-4 h-4 ml-1 text-gray-500" />
          </div>
          <div className="flex items-center space-x-3">
            <Avatar className="w-8 h-8">
              <AvatarFallback className="bg-gray-200">
                <User className="w-4 h-4" />
              </AvatarFallback>
            </Avatar>
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col">
          {isNewChat ? (
            /* New Chat Welcome */
            <div className="flex-1 flex flex-col items-center justify-center px-4">
              <div className="text-center mb-8">
                <h1 className="text-4xl font-medium text-gray-800 mb-2">ChatGPT</h1>
                <p className="text-gray-600">Ready when you are.</p>
              </div>

              <div className="w-full max-w-3xl">
                <div className="relative">
                  <Input
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    placeholder="Ask anything"
                    className="w-full h-14 pl-4 pr-16 rounded-3xl border border-gray-300 focus:border-gray-400 focus:ring-0 text-base bg-white shadow-sm"
                    onKeyPress={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault()
                        sendMessage()
                      }
                    }}
                    disabled={isLoading}
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <Button
                      onClick={sendMessage}
                      disabled={!inputMessage.trim() || isLoading}
                      className="h-8 w-8 p-0 bg-gray-200 hover:bg-gray-300 disabled:bg-gray-100 rounded-full"
                    >
                      <ArrowUp className="w-4 h-4 text-gray-600" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Chat Messages */
            <>
              <ScrollArea className="flex-1 px-4">
                <div className="max-w-3xl mx-auto py-6 space-y-6">
                  {messages.map((message, index) => (
                    <div key={index} className="flex items-start space-x-4">
                      <Avatar className="w-8 h-8 mt-1">
                        <AvatarFallback className={message.role === "user" ? "bg-blue-100" : "bg-green-100"}>
                          {message.role === "user" ? (
                            <User className="w-4 h-4 text-blue-600" />
                          ) : (
                            <div className="w-4 h-4 bg-green-600 rounded-sm flex items-center justify-center text-white text-xs font-bold">
                              G
                            </div>
                          )}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 mb-1">
                          {message.role === "user" ? "You" : "ChatGPT"}
                        </div>
                        <div className="text-gray-800 leading-relaxed">
                          {message.role === "assistant" ? (
                            <ReactMarkdown
                              components={{
                                // Custom styling for markdown elements
                                p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
                                h1: ({ children }) => <h1 className="text-xl font-bold mb-3">{children}</h1>,
                                h2: ({ children }) => <h2 className="text-lg font-bold mb-2">{children}</h2>,
                                h3: ({ children }) => <h3 className="text-base font-bold mb-2">{children}</h3>,
                                ul: ({ children }) => (
                                  <ul className="list-disc list-inside mb-3 space-y-1">{children}</ul>
                                ),
                                ol: ({ children }) => (
                                  <ol className="list-decimal list-inside mb-3 space-y-1">{children}</ol>
                                ),
                                li: ({ children }) => <li className="ml-2">{children}</li>,
                                code: ({ children, className }) => {
                                  const isInline = !className
                                  return isInline ? (
                                    <code className="bg-gray-100 px-1 py-0.5 rounded text-sm font-mono">
                                      {children}
                                    </code>
                                  ) : (
                                    <code className="block bg-gray-100 p-3 rounded-lg text-sm font-mono overflow-x-auto whitespace-pre">
                                      {children}
                                    </code>
                                  )
                                },
                                pre: ({ children }) => <div className="mb-3">{children}</div>,
                                blockquote: ({ children }) => (
                                  <blockquote className="border-l-4 border-gray-300 pl-4 italic mb-3">
                                    {children}
                                  </blockquote>
                                ),
                                strong: ({ children }) => <strong className="font-bold">{children}</strong>,
                                em: ({ children }) => <em className="italic">{children}</em>,
                              }}
                            >
                              {message.content}
                            </ReactMarkdown>
                          ) : (
                            <div className="whitespace-pre-wrap">{message.content}</div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}

                  {isLoading && (
                    <div className="flex items-start space-x-4">
                      <Avatar className="w-8 h-8 mt-1">
                        <AvatarFallback className="bg-green-100">
                          <div className="w-4 h-4 bg-green-600 rounded-sm flex items-center justify-center text-white text-xs font-bold">
                            G
                          </div>
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 mb-1">ChatGPT</div>
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                          <div
                            className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                            style={{ animationDelay: "0.1s" }}
                          ></div>
                          <div
                            className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                            style={{ animationDelay: "0.2s" }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              {/* Input Area - Fixed at bottom */}
              <div className="border-t border-gray-200 p-4">
                <div className="max-w-3xl mx-auto">
                  <div className="relative">
                    <Input
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      placeholder="Ask anything"
                      className="w-full h-12 pl-4 pr-16 rounded-3xl border border-gray-300 focus:border-gray-400 focus:ring-0 text-base bg-white"
                      onKeyPress={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault()
                          sendMessage()
                        }
                      }}
                      disabled={isLoading}
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <Button
                        onClick={sendMessage}
                        disabled={!inputMessage.trim() || isLoading}
                        className="h-8 w-8 p-0 bg-gray-200 hover:bg-gray-300 disabled:bg-gray-100 rounded-full"
                      >
                        <ArrowUp className="w-4 h-4 text-gray-600" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
