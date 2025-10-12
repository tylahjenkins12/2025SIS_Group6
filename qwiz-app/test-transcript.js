// TEST TRANSCRIPT - Paste this in the browser console on the lecturer session page
// This simulates speaking without needing the microphone

// Sample test transcripts about different topics
const testTranscripts = {
  "python": `
    Python is a high-level, interpreted programming language known for its simple syntax and readability.
    It was created by Guido van Rossum and first released in 1991. Python supports multiple programming
    paradigms including procedural, object-oriented, and functional programming. The language uses
    indentation to define code blocks rather than curly braces. Python has a large standard library
    and is widely used for web development, data science, artificial intelligence, and automation.
  `,

  "photosynthesis": `
    Photosynthesis is the process by which plants convert light energy into chemical energy.
    This process occurs in the chloroplasts of plant cells and involves two main stages:
    the light-dependent reactions and the light-independent reactions, also known as the Calvin cycle.
    During photosynthesis, plants take in carbon dioxide from the air and water from the soil,
    and use sunlight to produce glucose and oxygen. The overall equation is: 6CO2 + 6H2O + light → C6H12O6 + 6O2.
  `,

  "javascript": `
    JavaScript is a dynamic, interpreted programming language that is one of the core technologies of the web.
    It was created by Brendan Eich in 1995 and can run both in browsers and on servers using Node.js.
    JavaScript is event-driven and supports functional programming with first-class functions.
    Modern JavaScript includes features like async/await for handling asynchronous operations,
    arrow functions for concise syntax, and ES6 modules for better code organization.
  `,

  "worldwar2": `
    World War II was a global conflict that lasted from 1939 to 1945. It involved most of the world's nations
    forming two opposing military alliances: the Allies and the Axis powers. The war began with Germany's
    invasion of Poland on September 1, 1939. Major events included the Battle of Britain, Pearl Harbor attack,
    D-Day invasion, and the atomic bombings of Hiroshima and Nagasaki. The war ended with the surrender of
    Germany in May 1945 and Japan in August 1945.
  `
};

// Function to send fake transcript
function sendFakeTranscript(topic = "python") {
  const transcript = testTranscripts[topic] || testTranscripts.python;

  // Find the WebSocket send function in the page's context
  // This triggers the same flow as the microphone
  const event = new CustomEvent('test-transcript', {
    detail: { text: transcript.trim() }
  });

  console.log(`📝 Sending fake transcript about: ${topic}`);
  console.log(`📄 Content: ${transcript.substring(0, 100)}...`);

  // Simulate the MicCapture onTranscript callback
  // You'll need to call this from the React component context
  window.testTranscript = transcript.trim();

  alert(`Test transcript ready!\n\nTo use it:\n1. Click the microphone button\n2. Open browser console\n3. Type: document.querySelector('[data-transcript-test]')?.click()`);

  return transcript;
}

// Usage:
console.log("🧪 Test Transcript Helper Loaded!");
console.log("\nAvailable topics:", Object.keys(testTranscripts));
console.log("\nUsage: sendFakeTranscript('python')");
console.log("       sendFakeTranscript('photosynthesis')");
console.log("       sendFakeTranscript('javascript')");
console.log("       sendFakeTranscript('worldwar2')");

// Make it globally available
window.sendFakeTranscript = sendFakeTranscript;
window.testTranscripts = testTranscripts;
