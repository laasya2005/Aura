import type { PrismaClient, AuraProfile } from "@aura/db";
import {
  AppError,
  type AuditLogger,
  AuditActions,
  type UpdateAuraProfileInput,
} from "@aura/shared";
import { buildPersonalityPrompt, getPresetSliders } from "@aura/ai";

export class AuraService {
  constructor(
    private prisma: PrismaClient,
    private audit: AuditLogger
  ) {}

  async getProfile(userId: string): Promise<AuraProfile & { personalityPrompt: string }> {
    let profile = await this.prisma.auraProfile.findUnique({ where: { userId } });

    if (!profile) {
      // Create default profile
      profile = await this.prisma.auraProfile.create({
        data: { userId, mode: "GLOW" },
      });
    }

    const personalityPrompt = buildPersonalityPrompt(
      profile.mode,
      {
        warmth: profile.warmth,
        humor: profile.humor,
        directness: profile.directness,
        energy: profile.energy,
      },
      profile.customPrompt
    );

    return { ...profile, personalityPrompt };
  }

  async updateProfile(
    userId: string,
    input: UpdateAuraProfileInput,
    ip?: string
  ): Promise<AuraProfile> {
    const existing = await this.prisma.auraProfile.findUnique({ where: { userId } });

    // If switching to a preset mode, apply its sliders
    let sliderUpdates: Record<string, number> = {};
    if (input.mode && input.mode !== "CUSTOM" && input.mode !== existing?.mode) {
      const presetSliders = getPresetSliders(input.mode);
      sliderUpdates = { ...presetSliders };
    }

    // Enforce warmth floor (min 0.3) for safety
    if (input.warmth !== undefined) {
      input.warmth = Math.max(input.warmth, 0.3);
    }
    if (sliderUpdates.warmth !== undefined) {
      sliderUpdates.warmth = Math.max(sliderUpdates.warmth, 0.3);
    }

    const data = {
      ...sliderUpdates,
      ...(input.mode !== undefined ? { mode: input.mode } : {}),
      ...(input.warmth !== undefined ? { warmth: input.warmth } : {}),
      ...(input.humor !== undefined ? { humor: input.humor } : {}),
      ...(input.directness !== undefined ? { directness: input.directness } : {}),
      ...(input.energy !== undefined ? { energy: input.energy } : {}),
    };

    const profile = existing
      ? await this.prisma.auraProfile.update({ where: { userId }, data })
      : await this.prisma.auraProfile.create({ data: { userId, ...data } });

    await this.audit({
      userId,
      action: AuditActions.AURA_MODE_CHANGED,
      resource: "aura_profile",
      resourceId: profile.id,
      metadata: { mode: profile.mode, ...data },
      ipAddress: ip,
    });

    return profile;
  }

  async tuneWithNaturalLanguage(
    userId: string,
    instruction: string,
    userPlan: string,
    ip?: string
  ): Promise<AuraProfile> {
    // Only PRO and ELITE can use natural language tuning
    if (userPlan === "FREE") {
      throw AppError.planLimit("Natural language tuning requires PRO or ELITE plan");
    }

    const profile = await this.prisma.auraProfile.findUnique({ where: { userId } });
    if (!profile) throw AppError.notFound("Aura profile");

    // Store the custom instruction and switch to CUSTOM mode
    const updated = await this.prisma.auraProfile.update({
      where: { userId },
      data: {
        mode: "CUSTOM",
        customPrompt: instruction,
      },
    });

    await this.audit({
      userId,
      action: AuditActions.AURA_TUNED,
      resource: "aura_profile",
      resourceId: updated.id,
      metadata: { instruction: instruction.slice(0, 100) },
      ipAddress: ip,
    });

    return updated;
  }
}
