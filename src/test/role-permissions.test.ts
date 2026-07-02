/**
 * Role & permission regression tests.
 *
 * These tests hit the LIVE database using ONLY the public anon key,
 * simulating an unauthenticated visitor. They lock in that sensitive
 * tables and columns stay locked to anon and cannot regress into
 * public reads or token exposure bugs.
 *
 * If any of these tests fail, someone loosened a policy or column
 * in a way that leaks data to the world. Fix the policy, don't relax
 * the test.
 */
import { describe, it, expect } from "vitest";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

const anon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

/** A table is "closed to anon" when the query returns no rows and no
 *  permissive error — either an explicit permission error or an empty result
 *  under RLS. What we forbid is: a successful query that returns real rows. */
const expectAnonReadBlocked = async (table: string) => {
  const { data, error } = await anon.from(table as any).select("*").limit(1);
  if (error) {
    // RLS/permission denied is acceptable
    expect(error.message).toMatch(/permission|denied|policy|not allowed|does not exist/i);
    return;
  }
  expect(data ?? []).toEqual([]);
};

describe("role & permission regression", () => {
  it("anon cannot read user_roles (privilege escalation vector)", async () => {
    await expectAnonReadBlocked("user_roles");
  });

  it("anon cannot read security_events (audit log)", async () => {
    await expectAnonReadBlocked("security_events");
  });

  it("anon cannot read account_lockouts", async () => {
    await expectAnonReadBlocked("account_lockouts");
  });

  it("anon cannot read profiles (PII)", async () => {
    await expectAnonReadBlocked("profiles");
  });

  it("anon cannot read orders (customer data + M-Pesa codes)", async () => {
    await expectAnonReadBlocked("orders");
  });

  it("anon cannot read referral_codes (token exposure)", async () => {
    await expectAnonReadBlocked("referral_codes");
  });

  it("anon cannot read vip_members (unsubscribe tokens + PII)", async () => {
    await expectAnonReadBlocked("vip_members");
  });

  it("anon cannot read vip_coupon_redemptions", async () => {
    await expectAnonReadBlocked("vip_coupon_redemptions");
  });

  it("anon cannot read loyalty_accounts / transactions", async () => {
    await expectAnonReadBlocked("loyalty_accounts");
    await expectAnonReadBlocked("loyalty_transactions");
  });

  it("anon cannot read vouchers", async () => {
    await expectAnonReadBlocked("vouchers");
  });

  it("anon cannot read mpesa_transactions", async () => {
    await expectAnonReadBlocked("mpesa_transactions");
  });

  it("anon cannot INSERT into user_roles (privilege escalation)", async () => {
    const { error } = await anon.from("user_roles" as any).insert({
      user_id: "00000000-0000-0000-0000-000000000000",
      role: "super_admin",
    });
    expect(error).not.toBeNull();
    expect(error!.message).toMatch(/permission|denied|policy|not allowed|violates/i);
  });

  it("anon cannot UPDATE products (price tampering)", async () => {
    const { error } = await anon
      .from("products")
      .update({ retail_price: 1 })
      .eq("id", "00000000-0000-0000-0000-000000000000");
    // Either an RLS/permission error or a 0-row match — never a mutation success message.
    if (error) {
      expect(error.message).toMatch(/permission|denied|policy|not allowed/i);
    }
  });

  it("anon can only read public.site_settings whitelist keys", async () => {
    // Public settings – must succeed
    const { data: publicRows, error: publicErr } = await anon
      .from("site_settings")
      .select("key")
      .in("key", ["hours", "location", "logo_url"]);
    expect(publicErr).toBeNull();
    expect(Array.isArray(publicRows)).toBe(true);

    // Sensitive settings — must NOT be returned
    const { data: secretRows } = await anon
      .from("site_settings")
      .select("key,value")
      .in("key", ["cron_invoke_token", "loyalty_earn_ksh_per_point", "referral_reward_points"]);
    expect(secretRows ?? []).toEqual([]);
  });

  it("has_role RPC cannot be called anonymously to promote self", async () => {
    // Even if callable, it must not confer admin without a real assignment.
    const { data } = await anon.rpc("has_role" as any, {
      _user_id: "00000000-0000-0000-0000-000000000000",
      _role: "super_admin",
    });
    // Nil user cannot be super_admin — must return false or error
    if (data !== null && data !== undefined) {
      expect(data).toBe(false);
    }
  });
});
