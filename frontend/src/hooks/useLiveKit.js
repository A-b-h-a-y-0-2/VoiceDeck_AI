import { useCallback, useEffect, useRef, useState } from 'react'
import { Room, RoomEvent } from 'livekit-client'
import { SLIDES } from '../data/slides.js'
import { log, CATEGORY } from '../utils/logger.js'

const TOKEN_ENDPOINT = import.meta.env.VITE_TOKEN_ENDPOINT || 'http://localhost:8080/get-token'
const LIVEKIT_URL = import.meta.env.VITE_LIVEKIT_URL || ''

const MIC_CONSTRAINTS = { echoCancellation: true, noiseSuppression: true, sampleRate: 16000 }

export function useLiveKit({ onNavigate }) {
  const [room] = useState(() => new Room())
  const [connectionState, setConnectionState] = useState('disconnected')
  const [error, setError] = useState(null)
  const [micStream, setMicStream] = useState(null)
  const [micEnabled, setMicEnabled] = useState(false)
  const micStreamRef = useRef(null)

  const connect = useCallback(async () => {
    setError(null)
    setConnectionState('connecting')
    log(CATEGORY.NET, 'connect() called')

    try {
      // Get AEC stream for the waveform visualizer only — NOT published to room yet
      log(CATEGORY.NET, 'Requesting getUserMedia with AEC...')
      const stream = await navigator.mediaDevices.getUserMedia({ audio: MIC_CONSTRAINTS })
      micStreamRef.current = stream
      setMicStream(stream)
      log(CATEGORY.NET, 'getUserMedia granted', { tracks: stream.getTracks().map(t => t.label) })

      log(CATEGORY.NET, 'Fetching token...')
      const res = await fetch(TOKEN_ENDPOINT)
      if (!res.ok) throw new Error(`Token server returned ${res.status}`)
      const { token } = await res.json()
      log(CATEGORY.NET, `Token received (${token?.length} chars)`)

      if (!LIVEKIT_URL) throw new Error('VITE_LIVEKIT_URL is not set')

      log(CATEGORY.ROOM, 'Connecting to room...', { url: LIVEKIT_URL })
      await room.connect(LIVEKIT_URL, token, { autoSubscribe: true })
      log(CATEGORY.ROOM, 'Room connected — mic NOT published yet (user must click mic button)')
      setConnectionState('connected')
    } catch (err) {
      log(CATEGORY.ERR, 'connect() failed', { message: err.message })
      setError(err.message || 'Connection failed')
      setConnectionState('disconnected')
    }
  }, [room])

  // Use the official setMicrophoneEnabled API — reliable across all browsers
  const enableMic = useCallback(async () => {
    try {
      log(CATEGORY.ROOM, 'enableMic: calling setMicrophoneEnabled(true)')
      await room.localParticipant.setMicrophoneEnabled(true, MIC_CONSTRAINTS)
      setMicEnabled(true)
      log(CATEGORY.ROOM, 'Microphone published to room')
    } catch (err) {
      log(CATEGORY.ERR, 'enableMic failed', { message: err.message })
    }
  }, [room])

  const disableMic = useCallback(async () => {
    try {
      log(CATEGORY.ROOM, 'disableMic: calling setMicrophoneEnabled(false)')
      await room.localParticipant.setMicrophoneEnabled(false)
      setMicEnabled(false)
      log(CATEGORY.ROOM, 'Microphone unpublished')
    } catch (err) {
      log(CATEGORY.ERR, 'disableMic failed', { message: err.message })
    }
  }, [room])

  const disconnect = useCallback(async () => {
    log(CATEGORY.ROOM, 'disconnect() called')
    await room.disconnect()
    setMicEnabled(false)
    setMicStream(prev => {
      if (prev) prev.getTracks().forEach(t => t.stop())
      return null
    })
    micStreamRef.current = null
    setConnectionState('disconnected')
  }, [room])

  // Send a JSON message to the agent via data channel
  const sendToAgent = useCallback(async (msg) => {
    try {
      const payload = new TextEncoder().encode(JSON.stringify(msg))
      await room.localParticipant.publishData(payload, { reliable: true })
      log(CATEGORY.DATA, 'Sent to agent', msg)
    } catch (e) {
      log(CATEGORY.ERR, 'sendToAgent failed', { message: e.message })
    }
  }, [room])

  // Room events
  useEffect(() => {
    const handleData = (data, participant) => {
      try {
        const raw = new TextDecoder().decode(data)
        log(CATEGORY.DATA, 'DataReceived', { raw, from: participant?.identity })
        const msg = JSON.parse(raw)
        if (msg.type === 'navigate' && typeof msg.goToSlide === 'number') {
          const clamped = Math.max(0, Math.min(msg.goToSlide, SLIDES.length - 1))
          log(CATEGORY.DATA, `navigate → slide ${clamped}`)
          onNavigate(clamped)
        }
      } catch (e) {
        log(CATEGORY.ERR, 'DataReceived parse error', { error: e.message })
      }
    }

    const onConnected = () => { log(CATEGORY.ROOM, 'RoomEvent.Connected'); setConnectionState('connected') }
    const onDisconnected = (r) => { log(CATEGORY.ROOM, `RoomEvent.Disconnected reason=${r}`); setConnectionState('disconnected') }
    const onReconnecting = () => { log(CATEGORY.ROOM, 'RoomEvent.Reconnecting'); setConnectionState('reconnecting') }
    const onReconnected = () => { log(CATEGORY.ROOM, 'RoomEvent.Reconnected'); setConnectionState('connected') }
    const onParticipantConnected = (p) => log(CATEGORY.ROOM, `ParticipantConnected: ${p.identity}`)
    const onParticipantDisconnected = (p) => log(CATEGORY.ROOM, `ParticipantDisconnected: ${p.identity}`)
    const onTrackPublished = (pub, p) => log(CATEGORY.ROOM, `TrackPublished: ${p.identity} kind=${pub.kind} source=${pub.source}`)
    const onTrackSubscribed = (track, pub, p) => log(CATEGORY.ROOM, `TrackSubscribed: ${p.identity} kind=${track.kind}`)
    const onActiveSpeakers = (speakers) => log(CATEGORY.VAD, 'ActiveSpeakers', speakers.map(s => s.identity))
    const onSignalConnected = () => log(CATEGORY.NET, 'Signal WebSocket connected')

    room.on(RoomEvent.DataReceived, handleData)
    room.on(RoomEvent.Connected, onConnected)
    room.on(RoomEvent.Disconnected, onDisconnected)
    room.on(RoomEvent.Reconnecting, onReconnecting)
    room.on(RoomEvent.Reconnected, onReconnected)
    room.on(RoomEvent.ParticipantConnected, onParticipantConnected)
    room.on(RoomEvent.ParticipantDisconnected, onParticipantDisconnected)
    room.on(RoomEvent.TrackPublished, onTrackPublished)
    room.on(RoomEvent.TrackSubscribed, onTrackSubscribed)
    room.on(RoomEvent.ActiveSpeakersChanged, onActiveSpeakers)
    room.on(RoomEvent.SignalConnected, onSignalConnected)

    return () => {
      room.off(RoomEvent.DataReceived, handleData)
      room.off(RoomEvent.Connected, onConnected)
      room.off(RoomEvent.Disconnected, onDisconnected)
      room.off(RoomEvent.Reconnecting, onReconnecting)
      room.off(RoomEvent.Reconnected, onReconnected)
      room.off(RoomEvent.ParticipantConnected, onParticipantConnected)
      room.off(RoomEvent.ParticipantDisconnected, onParticipantDisconnected)
      room.off(RoomEvent.TrackPublished, onTrackPublished)
      room.off(RoomEvent.TrackSubscribed, onTrackSubscribed)
      room.off(RoomEvent.ActiveSpeakersChanged, onActiveSpeakers)
      room.off(RoomEvent.SignalConnected, onSignalConnected)
    }
  }, [room, onNavigate])

  useEffect(() => {
    return () => {
      room.disconnect()
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach(t => t.stop())
        micStreamRef.current = null
      }
    }
  }, [room])

  return { room, connectionState, error, micStream, micEnabled, connect, disconnect, enableMic, disableMic, sendToAgent }
}
