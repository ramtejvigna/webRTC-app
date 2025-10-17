"use client"

import { useParams } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import io, { type Socket } from "socket.io-client"
import { PhoneOff, Mic, MicOff, Video, VideoOff, Copy, Check, Settings } from "lucide-react"

const SIGNALING_SERVER = process.env.NEXT_PUBLIC_API_URL;
const ICE_SERVERS = [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" }
]

const Room = () => {
    const params = useParams()
    const roomId = params.id as string
    const localVideoRef = useRef<HTMLVideoElement>(null)
    const remoteVideoRef = useRef<HTMLVideoElement>(null)
    const pcRef = useRef<RTCPeerConnection | null>(null)
    const socketRef = useRef<Socket | null>(null)
    const localStreamRef = useRef<MediaStream | null>(null)
    const [status, setStatus] = useState("Starting...")
    const [isCallStarted, setIsCallStarted] = useState(false)
    const [isMuted, setIsMuted] = useState(false)
    const [isVideoOff, setIsVideoOff] = useState(false)
    const [copied, setCopied] = useState(false)
    const [remoteConnected, setRemoteConnected] = useState(false)
    const [localVideoReady, setLocalVideoReady] = useState(false)
    const [videoStreamActive, setVideoStreamActive] = useState(false)
    const [remoteVideoOff, setRemoteVideoOff] = useState(false)

    // Debug helper function
    const debugVideoStatus = () => {
        console.log("=== Video Debug Status ===")
        console.log("localVideoReady:", localVideoReady)
        console.log("localStreamRef.current:", localStreamRef.current)
        console.log("localVideoRef.current:", localVideoRef.current)
        if (localStreamRef.current) {
            console.log("Stream tracks:", localStreamRef.current.getTracks().map(t => ({
                kind: t.kind,
                enabled: t.enabled,
                readyState: t.readyState
            })))
        }
        if (localVideoRef.current) {
            console.log("Video srcObject:", localVideoRef.current.srcObject)
            console.log("Video readyState:", localVideoRef.current.readyState)
            console.log("Video paused:", localVideoRef.current.paused)
        }
        console.log("========================")
    }

    useEffect(() => {
        initializeConnection()
        return () => {
            cleanup()
        }
    }, [roomId])

    // Effect to set local video source when both stream and video element are ready
    useEffect(() => {
        const setVideoSource = async () => {
            if (localStreamRef.current && localVideoRef.current && localVideoReady) {
                console.log("Setting local video source in useEffect")
                try {
                    localVideoRef.current.srcObject = localStreamRef.current
                    await localVideoRef.current.play()
                    console.log("Video playing successfully")
                } catch (e) {
                    console.log("Auto-play prevented or error:", e)
                }
            }
        }
        setVideoSource()
    }, [localVideoReady])

    const initializeConnection = async () => {
        try {
            setStatus("Connecting to server...")
            socketRef.current = io(SIGNALING_SERVER, {
                forceNew: true,
                transports: ['websocket', 'polling']
            })

            // Wait for socket connection before proceeding
            socketRef.current.on('connect', async () => {
                console.log('Socket connected, ID:', socketRef.current?.id)
                setStatus("Getting camera access...")
                
                try {
                    const stream = await navigator.mediaDevices.getUserMedia({
                        video: true,
                        audio: true,
                    })

                    localStreamRef.current = stream
                    setLocalVideoReady(true)
                    setVideoStreamActive(stream.active && stream.getVideoTracks().length > 0)

                    // Set video source immediately if video element is ready
                    if (localVideoRef.current) {
                        console.log("Setting video source immediately")
                        localVideoRef.current.srcObject = stream
                        localVideoRef.current.play().catch(e => console.log("Auto-play prevented:", e))
                    }

                    // Debug the video status and force refresh video
                    setTimeout(() => {
                        debugVideoStatus()
                        if (localVideoRef.current && localStreamRef.current) {
                            console.log("Force refreshing video source")
                            localVideoRef.current.srcObject = null
                            setTimeout(() => {
                                if (localVideoRef.current && localStreamRef.current) {
                                    localVideoRef.current.srcObject = localStreamRef.current
                                    localVideoRef.current.play().catch(e => console.log("Auto-play prevented on refresh:", e))
                                }
                            }, 100)
                        }
                    }, 1000)

                    pcRef.current = new RTCPeerConnection({ iceServers: ICE_SERVERS })

                    stream.getTracks().forEach((track) => {
                        pcRef.current?.addTrack(track, stream)
                    })

                    pcRef.current.ontrack = (event) => {
                        const [remoteStream] = event.streams
                        if (remoteVideoRef.current) {
                            remoteVideoRef.current.srcObject = remoteStream
                        }
                        setRemoteConnected(true)
                        setStatus("Connected")
                    }

                    pcRef.current.onicecandidate = (event) => {
                        if (event.candidate && socketRef.current) {
                            socketRef.current.emit("signal", {
                                roomId,
                                data: { type: "ice-candidate", candidate: event.candidate },
                            })
                        }
                    }

                    pcRef.current.onconnectionstatechange = () => {
                        console.log('Connection state:', pcRef.current?.connectionState)
                        if (pcRef.current?.connectionState === 'connected') {
                            setStatus("Connected")
                        } else if (pcRef.current?.connectionState === 'disconnected') {
                            setStatus("Connection lost")
                            setRemoteConnected(false)
                        } else if (pcRef.current?.connectionState === 'failed') {
                            setStatus("Connection failed")
                            setRemoteConnected(false)
                        }
                    }

                    pcRef.current.onicegatheringstatechange = () => {
                        console.log('ICE gathering state:', pcRef.current?.iceGatheringState)
                    }

                    pcRef.current.oniceconnectionstatechange = () => {
                        console.log('ICE connection state:', pcRef.current?.iceConnectionState)
                        if (pcRef.current?.iceConnectionState === 'connected' || 
                            pcRef.current?.iceConnectionState === 'completed') {
                            console.log('ICE connection established successfully')
                        }
                    }

                    setupSocketListeners()

                    // Join room after everything is set up
                    console.log('Joining room:', roomId)
                    if (socketRef.current) {
                        socketRef.current.emit("join", roomId)
                    }
                    setStatus("Waiting for peer...")
                } catch (mediaError) {
                    console.error("Error accessing camera/microphone:", mediaError)
                    setStatus("Error accessing camera/microphone")
                }
            })

            socketRef.current.on('connect_error', (error) => {
                console.error('Socket connection error:', error)
                setStatus("Connection failed")
            })

            socketRef.current.on('disconnect', (reason) => {
                console.log('Socket disconnected:', reason)
                setStatus("Disconnected from server")
                setRemoteConnected(false)
            })

        } catch (error) {
            console.error("Error initializing connection:", error)
            setStatus("Error initializing connection")
        }
    }

    const setupSocketListeners = () => {
        if (!socketRef.current) return

        socketRef.current.on("user-joined", async () => {
            console.log("User joined the room")
            setStatus("User joined, creating offer...")
            await createOffer()
        })

        socketRef.current.on("signal", async ({ data }) => {
            console.log("Received signal:", data.type)
            if (!pcRef.current) return

            switch (data.type) {
                case "offer":
                    await handleOffer(data.offer)
                    break
                case "answer":
                    await handleAnswer(data.answer)
                    break
                case "ice-candidate":
                    await handleIceCandidate(data.candidate)
                    break
            }
        })

        socketRef.current.on("user-left", () => {
            console.log("User left the room")
            setStatus("User left the room")
            setRemoteConnected(false)
            setRemoteVideoOff(false)
            if (remoteVideoRef.current) {
                remoteVideoRef.current.srcObject = null
            }
        })

        socketRef.current.on("room-joined", () => {
            console.log("Successfully joined room:", roomId)
            setStatus("Waiting for peer...")
        })

        socketRef.current.on("video-toggle", (data) => {
            console.log("Remote user toggled video:", data.isVideoOff)
            setRemoteVideoOff(data.isVideoOff)
        })
    }

    const createOffer = async () => {
        if (!pcRef.current || !socketRef.current) {
            console.error("Cannot create offer: missing peer connection or socket")
            return
        }

        try {
            console.log("Creating offer...")
            const offer = await pcRef.current.createOffer({
                offerToReceiveAudio: true,
                offerToReceiveVideo: true
            })
            await pcRef.current.setLocalDescription(offer)
            console.log("Local description set, sending offer")

            socketRef.current.emit("signal", {
                roomId,
                data: { type: "offer", offer },
            })
            setIsCallStarted(true)
            setStatus("Offer sent, waiting for answer...")
        } catch (error) {
            console.error("Error creating offer:", error)
            setStatus("Failed to create offer")
        }
    }

    const handleOffer = async (offer: RTCSessionDescriptionInit) => {
        if (!pcRef.current || !socketRef.current) {
            console.error("Cannot handle offer: missing peer connection or socket")
            return
        }

        try {
            console.log("Received offer, setting remote description")
            await pcRef.current.setRemoteDescription(offer)
            
            console.log("Creating answer...")
            const answer = await pcRef.current.createAnswer()
            await pcRef.current.setLocalDescription(answer)
            console.log("Local description set, sending answer")

            socketRef.current.emit("signal", {
                roomId,
                data: { type: "answer", answer },
            })
            setIsCallStarted(true)
            setStatus("Answer sent, establishing connection...")
        } catch (error) {
            console.error("Error handling offer:", error)
            setStatus("Failed to handle offer")
        }
    }

    const handleAnswer = async (answer: RTCSessionDescriptionInit) => {
        if (!pcRef.current) {
            console.error("Cannot handle answer: missing peer connection")
            return
        }

        try {
            console.log("Received answer, setting remote description")
            await pcRef.current.setRemoteDescription(answer)
            setStatus("Connection established")
        } catch (error) {
            console.error("Error handling answer:", error)
            setStatus("Failed to handle answer")
        }
    }

    const handleIceCandidate = async (candidate: RTCIceCandidateInit) => {
        if (!pcRef.current) {
            console.error("Cannot handle ICE candidate: missing peer connection")
            return
        }

        try {
            console.log("Adding ICE candidate")
            await pcRef.current.addIceCandidate(candidate)
        } catch (error) {
            console.error("Error handling ICE candidate:", error)
        }
    }

    const toggleMute = () => {
        if (localStreamRef.current) {
            localStreamRef.current.getAudioTracks().forEach((track) => {
                track.enabled = !track.enabled
            })
            setIsMuted(!isMuted)
        }
    }

    const toggleVideo = () => {
        if (localStreamRef.current) {
            localStreamRef.current.getVideoTracks().forEach((track) => {
                track.enabled = !track.enabled
            })
            const newVideoState = !isVideoOff
            setIsVideoOff(newVideoState)
            
            // Emit video toggle state to remote user
            if (socketRef.current) {
                socketRef.current.emit("video-toggle", {
                    roomId,
                    isVideoOff: newVideoState
                })
            }
        }
    }

    const copyRoomId = () => {
        navigator.clipboard.writeText(roomId)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    const cleanup = () => {
        console.log("Cleaning up connection...")
        
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach((track) => {
                track.stop()
                console.log("Stopped track:", track.kind)
            })
            localStreamRef.current = null
        }
        
        if (pcRef.current) {
            pcRef.current.close()
            pcRef.current = null
        }
        
        if (socketRef.current) {
            socketRef.current.emit("leave", roomId)
            socketRef.current.removeAllListeners()
            socketRef.current.disconnect()
            socketRef.current = null
        }
        
        setRemoteConnected(false)
        setLocalVideoReady(false)
        setIsCallStarted(false)
    }

    const leaveRoom = () => {
        cleanup()
        window.location.href = "/"
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-background via-card to-background flex flex-col">
            <header className="bg-card/50 backdrop-blur-md border-b border-border px-6 py-4 shadow-lg">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full bg-primary animate-pulse-glow"></div>
                        <div>
                            <h1 className="text-xl font-bold text-foreground">Video Call</h1>
                            <p className="text-sm text-muted-foreground">{status}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div
                            className="bg-input rounded-lg px-3 py-2 flex items-center gap-2 group cursor-pointer hover:bg-input/80 transition-colors"
                            onClick={copyRoomId}
                        >
                            <code className="text-sm text-muted-foreground font-mono" title={roomId}>
                                Room: {roomId.slice(0, 8)}...
                            </code>
                            {copied ? (
                                <Check className="w-4 h-4 text-primary" />
                            ) : (
                                <Copy className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                            )}
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Video Area */}
            <main className="flex-1 flex items-center justify-center p-6 overflow-hidden">
                <div className="w-full max-w-6xl">
                    {remoteConnected ? (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
                            {/* Remote Video */}
                            <div className="relative bg-black rounded-2xl overflow-hidden shadow-2xl group">
                                <video 
                                    ref={remoteVideoRef} 
                                    autoPlay 
                                    playsInline 
                                    className={`w-full h-full object-cover transition-opacity duration-300 ${remoteVideoOff ? 'opacity-0' : 'opacity-100'}`} 
                                />
                                {remoteVideoOff && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
                                        <div className="text-center">
                                            <VideoOff className="w-16 h-16 text-gray-400 mx-auto mb-2" />
                                            <p className="text-gray-400">Guest turned off camera</p>
                                        </div>
                                    </div>
                                )}
                                <div className="absolute inset-0 border-2 border-primary/20 rounded-2xl pointer-events-none group-hover:border-primary/40 transition-colors duration-300"></div>
                                <div className="absolute top-4 left-4 bg-black/50 backdrop-blur-sm px-3 py-1 rounded-full text-sm text-foreground flex items-center gap-2">
                                    <div className={`w-2 h-2 rounded-full ${remoteVideoOff ? 'bg-red-500' : 'bg-green-500'} animate-pulse`}></div>
                                    Guest {remoteVideoOff ? '(Camera Off)' : '(Live)'}
                                </div>
                            </div>

                            {/* Local Video */}
                            <div className="relative bg-black rounded-2xl overflow-hidden shadow-2xl group">
                                <video 
                                    ref={(element) => {
                                        localVideoRef.current = element
                                        if (element && localStreamRef.current) {
                                            console.log("Video element ready, setting stream")
                                            element.srcObject = localStreamRef.current
                                            element.play().catch(e => console.log("Auto-play prevented:", e))
                                        }
                                    }}
                                    autoPlay 
                                    playsInline 
                                    muted 
                                    className={`w-full h-full object-cover transition-opacity duration-300 ${isVideoOff ? 'opacity-0' : 'opacity-100'}`}
                                    onLoadedMetadata={() => console.log("Local video metadata loaded")}
                                    onCanPlay={() => console.log("Local video can play")}
                                    onError={(e) => console.error("Local video error:", e)}
                                />
                                {isVideoOff && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
                                        <div className="text-center">
                                            <VideoOff className="w-16 h-16 text-gray-400 mx-auto mb-2" />
                                            <p className="text-gray-400">You turned off camera</p>
                                        </div>
                                    </div>
                                )}
                                <div className="absolute inset-0 border-2 border-accent/20 rounded-2xl pointer-events-none group-hover:border-accent/40 transition-colors duration-300"></div>
                                <div className="absolute top-4 left-4 bg-black/50 backdrop-blur-sm px-3 py-1 rounded-full text-sm text-foreground flex items-center gap-2">
                                    <div className={`w-2 h-2 rounded-full ${isVideoOff ? 'bg-red-500' : 'bg-green-500'} animate-pulse`}></div>
                                    You {isVideoOff ? '(Camera Off)' : '(Live)'}
                                </div>
                            </div>
                        </div>
                    ) : localVideoReady ? (
                        <div className="flex flex-col items-center justify-center gap-8">
                            {/* Local Video When Waiting */}
                            <div className="relative bg-black rounded-2xl overflow-hidden shadow-2xl group max-w-md w-full">
                                <video 
                                    ref={(element) => {
                                        localVideoRef.current = element
                                        if (element && localStreamRef.current) {
                                            console.log("Video element ready (waiting), setting stream")
                                            element.srcObject = localStreamRef.current
                                            element.play().catch(e => console.log("Auto-play prevented:", e))
                                        }
                                    }}
                                    autoPlay 
                                    playsInline 
                                    muted 
                                    className={`w-full h-full object-cover transition-opacity duration-300 ${isVideoOff ? 'opacity-0' : 'opacity-100'}`}
                                    onLoadedMetadata={() => console.log("Local video metadata loaded (waiting)")}
                                    onCanPlay={() => console.log("Local video can play (waiting)")}
                                    onError={(e) => console.error("Local video error (waiting):", e)}
                                />
                                {isVideoOff && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
                                        <div className="text-center">
                                            <VideoOff className="w-16 h-16 text-gray-400 mx-auto mb-2" />
                                            <p className="text-gray-400">You turned off camera</p>
                                        </div>
                                    </div>
                                )}
                                <div className="absolute inset-0 border-2 border-accent/20 rounded-2xl pointer-events-none group-hover:border-accent/40 transition-colors duration-300"></div>
                                <div className="absolute top-4 left-4 bg-black/50 backdrop-blur-sm px-3 py-1 rounded-full text-sm text-foreground flex items-center gap-2">
                                    <div className={`w-2 h-2 rounded-full ${isVideoOff ? 'bg-red-500' : 'bg-green-500'} animate-pulse`}></div>
                                    You {isVideoOff ? '(Camera Off)' : '(Live)'}
                                </div>
                            </div>
                            
                            {/* Waiting Message */}
                            <div className="flex flex-col items-center justify-center">
                                <div className="relative w-16 h-16 mb-4">
                                    <div className="absolute inset-0 bg-gradient-to-r from-primary to-accent rounded-full blur-xl opacity-50 animate-pulse"></div>
                                    <div className="absolute inset-0 bg-card rounded-full border-2 border-primary/30 flex items-center justify-center">
                                        <Video className="w-6 h-6 text-primary animate-pulse" />
                                    </div>
                                </div>
                                <h2 className="text-xl font-bold text-foreground mb-2">Waiting for peer...</h2>
                                <p className="text-muted-foreground text-center max-w-sm">
                                    Share the room ID with someone to start the call
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-96">
                            <div className="relative w-32 h-32 mb-8">
                                <div className="absolute inset-0 bg-gradient-to-r from-primary to-accent rounded-full blur-2xl opacity-50 animate-pulse"></div>
                                <div className="absolute inset-0 bg-card rounded-full border-2 border-primary/30 flex items-center justify-center">
                                    <Video className="w-12 h-12 text-primary animate-pulse" />
                                </div>
                            </div>
                            <h2 className="text-2xl font-bold text-foreground mb-2">Setting up camera...</h2>
                            <p className="text-muted-foreground text-center max-w-sm">
                                Please allow camera and microphone access
                            </p>
                        </div>
                    )}
                </div>
            </main>

            {/* Control Bar */}
            <footer className="bg-card/50 backdrop-blur-md border-t border-border px-6 py-6 shadow-lg">
                <div className="max-w-7xl mx-auto flex items-center justify-center gap-4">
                    <button
                        onClick={toggleMute}
                        className={`p-4 rounded-full transition-all duration-300 transform hover:scale-110 active:scale-95 ${isMuted
                                ? "bg-destructive/20 text-destructive hover:bg-destructive/30"
                                : "bg-primary/20 text-primary hover:bg-primary/30"
                            }`}
                        title={isMuted ? "Unmute" : "Mute"}
                    >
                        {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                    </button>

                    <button
                        onClick={toggleVideo}
                        className={`p-4 rounded-full transition-all duration-300 transform hover:scale-110 active:scale-95 ${isVideoOff
                                ? "bg-destructive/20 text-destructive hover:bg-destructive/30"
                                : "bg-primary/20 text-primary hover:bg-primary/30"
                            }`}
                        title={isVideoOff ? "Turn on camera" : "Turn off camera"}
                    >
                        {isVideoOff ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
                    </button>

                    <button
                        className="p-4 rounded-full bg-muted/20 text-muted-foreground hover:bg-muted/30 transition-all duration-300 transform hover:scale-110 active:scale-95"
                        title="Settings"
                    >
                        <Settings className="w-6 h-6" />
                    </button>

                    <div className="w-px h-8 bg-border"></div>

                    <button
                        onClick={leaveRoom}
                        className="px-6 py-3 bg-gradient-to-r from-destructive to-destructive/80 hover:from-destructive/90 hover:to-destructive/70 text-destructive-foreground font-semibold rounded-full transition-all duration-300 transform hover:scale-105 active:scale-95 flex items-center gap-2 shadow-lg hover:shadow-xl"
                    >
                        <PhoneOff className="w-5 h-5" />
                        Leave Call
                    </button>
                </div>
            </footer>
        </div>
    )
}

export default Room