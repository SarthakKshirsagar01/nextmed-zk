export type LaceApi = {
  enable: () => Promise<unknown>;
  isEnabled?: () => Promise<boolean>;
};

export type CardanoWindow = {
  lace?: LaceApi;
};

export function getCardanoWindow(): CardanoWindow | undefined {
  if (typeof window === "undefined") {
    return undefined;
  }

  const w = window as Window & { cardano?: CardanoWindow };
  return w.cardano;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error("LACE_TIMEOUT"));
    }, timeoutMs);

    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

export async function detectLace(
  retries = 8,
  intervalMs = 250,
): Promise<boolean> {
  for (let i = 0; i <= retries; i += 1) {
    const cardano = getCardanoWindow();
    if (cardano?.lace) {
      return true;
    }

    if (i < retries) {
      await sleep(intervalMs);
    }
  }

  return false;
}

export async function connectLace(timeoutMs = 30000): Promise<boolean> {
  const cardano = getCardanoWindow();
  if (!cardano?.lace) {
    return false;
  }

  // Check if already enabled.
  if (cardano.lace.isEnabled) {
    try {
      const alreadyEnabled = await withTimeout(cardano.lace.isEnabled(), 1500);
      if (alreadyEnabled) {
        return true;
      }
    } catch {
      // Continue to enable flow.
    }
  }

  // Fire enable() but do NOT wait for it.
  // In some Lace builds, enable() promise never resolves.
  // Instead, poll isEnabled() to detect user approval in popup.
  cardano.lace.enable().catch(() => {
    // Silently ignore enable errors while polling.
  });

  // Poll isEnabled() while popup is open.
  const startTime = Date.now();
  while (Date.now() - startTime < timeoutMs) {
    if (cardano.lace?.isEnabled) {
      try {
        const enabled = await withTimeout(cardano.lace.isEnabled(), 1500);
        if (enabled) {
          return true;
        }
      } catch {
        // Keep polling, extension may be settling.
      }
    }

    await sleep(250);
  }

  throw new Error("LACE_TIMEOUT");
}
