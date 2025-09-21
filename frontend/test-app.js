#!/usr/bin/env node

/**
 * Simple test script to verify the app starts correctly
 */

const { spawn } = require('child_process');
const http = require('http');

console.log('🚀 Starting Anyrand Frontend test...');

// Start the development server
const server = spawn('yarn', ['dev'], {
  stdio: 'pipe',
  env: { ...process.env, FORCE_COLOR: '1' }
});

let serverReady = false;
let serverUrl = '';

server.stdout.on('data', (data) => {
  const output = data.toString();
  console.log(output);

  // Check if server is ready
  if (output.includes('Ready in') && output.includes('Local:')) {
    const urlMatch = output.match(/Local:\s+(http:\/\/[^\s]+)/);
    if (urlMatch) {
      serverUrl = urlMatch[1];
      serverReady = true;
      console.log(`✅ Server started at ${serverUrl}`);

      // Test the server
      setTimeout(testServer, 2000);
    }
  }
});

server.stderr.on('data', (data) => {
  console.error('Server Error:', data.toString());
});

function testServer() {
  if (!serverReady || !serverUrl) {
    console.error('❌ Server not ready for testing');
    process.exit(1);
  }

  console.log('🧪 Testing server response...');

  const url = new URL(serverUrl);
  const options = {
    hostname: url.hostname,
    port: url.port,
    path: '/',
    method: 'GET'
  };

  const req = http.request(options, (res) => {
    console.log(`✅ Server responded with status: ${res.statusCode}`);

    if (res.statusCode === 200) {
      console.log('🎉 Frontend is working correctly!');
      console.log(`📱 Open ${serverUrl} in your browser to test wallet connection`);
      console.log('💡 Make sure to set NEXT_PUBLIC_WC_PROJECT_ID in .env.local');
    } else {
      console.log('⚠️  Server responded but with non-200 status');
    }

    // Keep server running for manual testing
    console.log('⏸️  Server is running. Press Ctrl+C to stop.');
  });

  req.on('error', (err) => {
    console.error('❌ Failed to connect to server:', err.message);
    process.exit(1);
  });

  req.end();
}

// Handle cleanup
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down server...');
  server.kill();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down server...');
  server.kill();
  process.exit(0);
});