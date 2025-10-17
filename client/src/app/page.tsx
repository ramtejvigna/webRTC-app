"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { v4 as uuidv4 } from "uuid"
import { Video, Plus, LogIn, Copy, Check } from "lucide-react"

export default function Home() {
  const router = useRouter()
  const [roomId, setRoomId] = useState("")
  const [copied, setCopied] = useState(false)

  const createRoom = () => {
    const id = uuidv4()
    router.push(`/room/${id}`)
  }

  const joinRoom = () => {
    if (!roomId.trim()) {
      alert("Please enter a room ID")
      return
    }
    router.push(`/room/${roomId}`)
  }

  const copyToClipboard = () => {
    if (roomId) {
      navigator.clipboard.writeText(roomId)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-card flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-pulse"></div>
        <div
          className="absolute bottom-20 right-10 w-72 h-72 bg-accent/10 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: "1s" }}
        ></div>
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-12 animate-slide-in-up">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-3 bg-gradient-to-br from-primary to-accent rounded-xl shadow-lg">
              <Video className="w-8 h-8 text-primary-foreground" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              ConnectCall
            </h1>
          </div>
          <p className="text-muted-foreground text-lg">Crystal clear peer-to-peer video calls</p>
        </div>

        {/* Create Room Card */}
        <div
          className="bg-card border border-border rounded-2xl p-8 mb-6 shadow-xl hover:shadow-2xl transition-all duration-300 animate-fade-in"
          style={{ animationDelay: "0.1s" }}
        >
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Plus className="w-5 h-5 text-primary" />
            Start a New Call
          </h2>
          <p className="text-muted-foreground text-sm mb-6">Create a new room and share the ID with others</p>
          <button
            onClick={createRoom}
            className="w-full bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-primary-foreground font-semibold py-3 px-6 rounded-xl transition-all duration-300 transform hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl flex items-center justify-center gap-2 group"
          >
            <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
            Create Room
          </button>
        </div>

        {/* Join Room Card */}
        <div
          className="bg-card border border-border rounded-2xl p-8 shadow-xl hover:shadow-2xl transition-all duration-300 animate-fade-in"
          style={{ animationDelay: "0.2s" }}
        >
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <LogIn className="w-5 h-5 text-accent" />
            Join Existing Call
          </h2>
          <p className="text-muted-foreground text-sm mb-6">Enter a room ID to join an active call</p>

          <div className="space-y-3">
            <div className="relative">
              <input
                type="text"
                placeholder="Paste room ID here..."
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && joinRoom()}
                className="w-full bg-input border border-border rounded-xl px-4 py-3 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-300"
              />
              {roomId && (
                <button
                  onClick={copyToClipboard}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-2 hover:bg-muted rounded-lg transition-colors duration-200"
                  title="Copy room ID"
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-primary" />
                  ) : (
                    <Copy className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                  )}
                </button>
              )}
            </div>

            <button
              onClick={joinRoom}
              disabled={!roomId.trim()}
              className="w-full bg-secondary hover:bg-secondary/90 disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed text-secondary-foreground font-semibold py-3 px-6 rounded-xl transition-all duration-300 transform hover:scale-105 active:scale-95 disabled:scale-100 flex items-center justify-center gap-2"
            >
              <LogIn className="w-5 h-5" />
              Join Call
            </button>
          </div>
        </div>

        {/* Footer */}
        <div
          className="text-center mt-8 text-muted-foreground text-sm animate-fade-in"
          style={{ animationDelay: "0.3s" }}
        >
          <p>Secure peer-to-peer connection • No data stored</p>
        </div>
      </div>
    </div>
  )
}