const MASTER_KEY = "$2a$10$e6BNHkLwsUDMBX84u5s1BOoqC4u0./AemztoL8E1.RZKWuN3UVnd6";
const BIN_ID = "69c904256860e0745bffaf1c";
const JSONBIN_BASE = "https://api.jsonbin.io/v3/b";

async function test() {
    console.log("--- Testing PULL ---");
    try {
        const res = await fetch(`${JSONBIN_BASE}/${BIN_ID}/latest`, {
            headers: { 'X-Master-Key': MASTER_KEY }
        });
        const data = await res.json();
        console.log("Pull Status:", res.status);
        console.log("Record Count:", (data.record || []).length);
        console.log("First item id:", data.record && data.record[0] ? data.record[0].id : "none");

        const pins = data.record || [];
        const newPin = { id: 'test' + Date.now(), title: 'Test Pin' };
        const updatedPins = [newPin, ...pins];

        console.log("\n--- Testing PUSH ---");
        const pushRes = await fetch(`${JSONBIN_BASE}/${BIN_ID}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'X-Master-Key': MASTER_KEY
            },
            body: JSON.stringify(updatedPins)
        });
        const pushData = await pushRes.json();
        console.log("Push Status:", pushRes.status);
        console.log("Push Result:", pushData.metadata ? "Success" : "Failed");

        console.log("\n--- Testing PULL AGAIN ---");
        const res2 = await fetch(`${JSONBIN_BASE}/${BIN_ID}/latest?t=` + Date.now(), {
            headers: { 'X-Master-Key': MASTER_KEY }
        });
        const data2 = await res2.json();
        console.log("Second Pull Count:", (data2.record || []).length);
        console.log("First item id:", data2.record && data2.record[0] ? data2.record[0].id : "none");

    } catch (e) {
        console.error("Test failed:", e);
    }
}

test();
