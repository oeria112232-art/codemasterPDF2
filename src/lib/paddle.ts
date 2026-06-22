import { initializePaddle, Paddle } from '@paddle/paddle-js';

let paddleInstance: Paddle | undefined;

export const getPaddleInstance = async () => {
    if (paddleInstance) return paddleInstance;

    try {
        paddleInstance = await initializePaddle({
            environment: import.meta.env.VITE_PADDLE_ENV === 'production' ? 'production' : 'sandbox',
            token: import.meta.env.VITE_PADDLE_CLIENT_TOKEN!,
            eventCallback: (_data: unknown) => {
                // console.log('Paddle Event:', data);
            }
        });

        // console.log("Paddle initialized with token:", import.meta.env.VITE_PADDLE_CLIENT_TOKEN); // Debug log


        return paddleInstance;
    } catch (error) {
        console.error("Failed to initialize Paddle:", error);
        return undefined;
    }
};

export const openCheckout = async (_priceId: string, _email?: string) => {
    const paddle = await getPaddleInstance();

    if (!paddle) {
        console.error("Paddle not initialized");
        return;
    }

    console.log("Payment system is disabled. Feature is now free.");
    // Paddle disabled.
    return;
};
