/**
 * One-time setup script to configure SIP trunking between Twilio and LiveKit.
 *
 * This script:
 * 1. Creates a Twilio Elastic SIP Trunk
 * 2. Associates the existing Twilio phone number with the trunk
 * 3. Creates an outbound SIP trunk in LiveKit
 * 4. Outputs the LIVEKIT_SIP_TRUNK_ID to set in .env
 *
 * Usage: pnpm --filter @aura/voice-agent setup-sip
 */

import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../../..", ".env") });

import Twilio from "twilio";
import { SipClient } from "livekit-server-sdk";

async function main() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const phoneNumber = process.env.TWILIO_PHONE_NUMBER;
  const livekitUrl = process.env.LIVEKIT_URL;
  const livekitApiKey = process.env.LIVEKIT_API_KEY;
  const livekitApiSecret = process.env.LIVEKIT_API_SECRET;

  if (!accountSid || !authToken) {
    console.error("Error: TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN must be set");
    process.exit(1);
  }
  if (!phoneNumber) {
    console.error("Error: TWILIO_PHONE_NUMBER must be set");
    process.exit(1);
  }
  if (!livekitUrl || !livekitApiKey || !livekitApiSecret) {
    console.error("Error: LIVEKIT_URL, LIVEKIT_API_KEY, and LIVEKIT_API_SECRET must be set");
    process.exit(1);
  }

  const twilioClient = Twilio(accountSid, authToken);
  const sipClient = new SipClient(livekitUrl, livekitApiKey, livekitApiSecret);

  console.log("Step 1: Creating Twilio Elastic SIP Trunk...");
  const trunk = await twilioClient.trunking.v1.trunks.create({
    friendlyName: "Aura LiveKit SIP Trunk",
  });
  console.log(`  Trunk SID: ${trunk.sid}`);

  console.log("Step 2: Setting termination URI...");
  // LiveKit SIP endpoint - strip protocol prefix and trailing slash
  const livekitHost = livekitUrl
    .replace(/^wss?:\/\//, "")
    .replace(/^https?:\/\//, "")
    .replace(/\/$/, "");

  await twilioClient.trunking.v1.trunks(trunk.sid).originationUrls.create({
    friendlyName: "LiveKit SIP",
    sipUrl: `sip:${livekitHost}`,
    priority: 1,
    weight: 1,
    enabled: true,
  });
  console.log(`  Origination URI set to: sip:${livekitHost}`);

  console.log("Step 3: Associating phone number with trunk...");
  const incomingNumbers = await twilioClient.incomingPhoneNumbers.list({
    phoneNumber,
  });
  if (incomingNumbers.length === 0) {
    console.error(`  Error: Phone number ${phoneNumber} not found in Twilio account`);
    process.exit(1);
  }
  const phoneNumberSid = incomingNumbers[0].sid;

  await twilioClient.trunking.v1.trunks(trunk.sid).phoneNumbers.create({ phoneNumberSid });
  console.log(`  Phone number ${phoneNumber} associated with trunk`);

  console.log("Step 4: Creating LiveKit outbound SIP trunk...");
  const twilioSipAddress = `${accountSid}.pstn.twilio.com`;

  const outboundTrunk = await sipClient.createSipOutboundTrunk(
    "Aura Twilio Outbound",
    twilioSipAddress,
    [phoneNumber],
    {
      authUsername: accountSid,
      authPassword: authToken,
    }
  );
  const trunkId = outboundTrunk.sipTrunkId;
  console.log(`  LiveKit SIP Trunk ID: ${trunkId}`);

  console.log("\n--- Setup Complete ---");
  console.log(`\nAdd this to your .env file:\n`);
  console.log(`LIVEKIT_SIP_TRUNK_ID="${trunkId}"`);
}

main().catch((err) => {
  console.error("Setup failed:", err);
  process.exit(1);
});
