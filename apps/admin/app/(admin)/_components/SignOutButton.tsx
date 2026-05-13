"use client";

import { handleSignOut } from "./actions";

export function SignOutButton() {
  return (
    <form action={handleSignOut}>
      <button
        type="submit"
        className="w-full text-left text-sm text-stone-500 hover:text-red-600 transition-colors"
      >
        Sign out
      </button>
    </form>
  );
}
