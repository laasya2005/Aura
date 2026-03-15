export { sendOtp, checkOtp, _setClient as _setTwilioClient } from "./twilio/verify.js";

export {
  sendSms,
  validateTwilioSignature,
  formatForSms,
  checkTcpaKeywords,
  isQuietHours,
  _setSmsClient,
  type SmsResult,
  type TcpaAction,
} from "./twilio/sms.js";

export {
  sendWhatsApp,
  sendWhatsAppTemplate,
  trySendWhatsApp,
  formatForWhatsApp,
  _setWhatsAppClient,
  type WhatsAppResult,
} from "./twilio/whatsapp.js";

export {
  initiateCall,
  buildTwimlSay,
  buildTwimlHangup,
  MONTHLY_CALL_LIMITS,
  _setVoiceClient,
  type CallResult,
} from "./twilio/voice.js";

export { textToSpeech, getVoiceForMode, type TtsResult } from "./elevenlabs/tts.js";

export { transcribeAudio, transcribeFromUrl, type TranscriptionResult } from "./deepgram/stt.js";

export { createRoom } from "./livekit/client.js";

export { dialUserViaSip } from "./livekit/sip.js";
