import { describe, expect, it } from "vitest";
import { resolveLegacyModel } from "./legacy-model-resolver.js";

describe("legacy model resolver", () => {
  it("uses active, launch, then profile default precedence", () => {
    expect(resolveLegacyModel({ profileId: "p", activeModel: " active ", launchConfigModel: "launch", profileDefaultModel: "profile" })).toMatchObject({ modelId: "active", source: "active-model" });
    expect(resolveLegacyModel({ profileId: "p", activeModel: "default", launchConfigModel: " launch ", profileDefaultModel: "profile" })).toMatchObject({ modelId: "launch", source: "launch-config" });
    expect(resolveLegacyModel({ profileId: "p", activeModel: "", launchConfigModel: "default", profileDefaultModel: " profile " })).toMatchObject({ modelId: "profile", source: "profile-default" });
  });

  it("normalizes empty and default values, including a missing profile default", () => {
    expect(resolveLegacyModel({ profileId: "p", activeModel: "default", launchConfigModel: " ", profileDefaultModel: "default" })).toEqual({ kind: "legacy-profile-model", profileId: "p", modelId: null, source: "profile-default" });
  });
});
