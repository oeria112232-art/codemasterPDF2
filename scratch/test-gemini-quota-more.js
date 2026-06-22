const apiKey = 'AQ.Ab8RN6IDw5D9b3S6PTMyaelq41jSqzi7JTM1EjY6qkP-RBKDmQ';
const promptText = 'Translate this sentence to Arabic: Hello world!';

async function testModel(modelName) {
    console.log(`\nTesting ${modelName}...`);
    const url = `https://generativelanguage.googleapis.com/v1/models/${modelName}:generateContent?key=${apiKey}`;
    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: promptText }] }]
            })
        });
        const json = await res.json();
        console.log("Status:", res.status);
        if (res.status === 200) {
            console.log("Success!");
            return true;
        } else {
            console.log("Error Message:", json.error?.message?.split('\n')[0]);
            return false;
        }
    } catch (err) {
        console.error("Error:", err.message);
        return false;
    }
}

async function run() {
    const models = [
        'gemini-2.5-flash-lite',
        'gemini-3.5-flash',
        'gemini-3.1-flash-lite'
    ];
    for (const m of models) {
        await testModel(m);
    }
}

run();
