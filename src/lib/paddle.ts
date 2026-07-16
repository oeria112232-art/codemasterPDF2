import { Paddle } from '@paddle/paddle-js';

let paddleInstance: Paddle | undefined;

export const getPaddleInstance = async () => {
    const token = import.meta.env.VITE_PADDLE_CLIENT_TOKEN;
    if (!token) return undefined;
    if (paddleInstance) return paddleInstance;

    try {
        const { initializePaddle } = await import('@paddle/paddle-js');
        paddleInstance = await initializePaddle({
            environment: import.meta.env.VITE_PADDLE_ENV === 'production' ? 'production' : 'sandbox',
            token,
            eventCallback: (_data: unknown) => {}
        });
        return paddleInstance;
    } catch (error) {
        console.error("Failed to initialize Paddle:", error);
        return undefined;
    }
};

export const openCheckout = async (_priceId: string, _email?: string) => {
    console.log("Payment system is disabled. Feature is now free.");
    return;
};
