import { SIPTransport } from "@livekit/protocol";
import { getSipClient } from "./client.js";

export async function dialUserViaSip(
  roomName: string,
  phone: string,
  identity: string
): Promise<{ participantId: string; participantIdentity: string }> {
  const trunkId = process.env.LIVEKIT_SIP_TRUNK_ID;
  if (!trunkId) throw new Error("LIVEKIT_SIP_TRUNK_ID must be set");

  const participant = await getSipClient().createSipParticipant(trunkId, phone, roomName, {
    participantIdentity: identity,
    participantName: "Phone User",
    krispEnabled: true,
    waitUntilAnswered: true,
  });

  return {
    participantId: participant.participantId,
    participantIdentity: participant.participantIdentity,
  };
}

export async function setupOutboundSipTrunk(
  name: string,
  address: string,
  numbers: string[],
  auth?: { username: string; password: string }
): Promise<{ trunkId: string }> {
  const trunk = await getSipClient().createSipOutboundTrunk(name, address, numbers, {
    transport: SIPTransport.SIP_TRANSPORT_AUTO,
    authUsername: auth?.username,
    authPassword: auth?.password,
  });

  return { trunkId: trunk.sipTrunkId };
}
