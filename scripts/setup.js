const { exec } = require("child_process");
const fs = require("fs");
const readline = require("readline");
const path = require("path");
const crypto = require("crypto");

// Function to run shell commands
function runCommand(command, cwd) {
  return new Promise((resolve, reject) => {
    exec(command, { cwd }, (error, stdout, stderr) => {
      if (error) {
        reject(stderr);
      } else {
        resolve(stdout);
      }
    });
  });
}

// Function to prompt user for input
function askQuestion(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) =>
    rl.question(query, (ans) => {
      rl.close();
      resolve(ans);
    }),
  );
}

// Function to generate a secure random string
function generateSecureKey(length = 64) {
  return crypto.randomBytes(length).toString('hex');
}

// Function to check if a virtual environment exists
function isVenvInstalled(flaskBackendPath) {
  const venvPath = path.join(flaskBackendPath, "venv");
  return fs.existsSync(venvPath);
}

async function setupProject() {
  try {
    console.log("Installing Node.js dependencies...");
    await runCommand("npm install", "./");

    const flaskBackendPath = "./flask-backend";

    // Check if a virtual environment exists
    if (!isVenvInstalled(flaskBackendPath)) {
      console.log("Creating a virtual environment...");
      await runCommand("python3 -m venv venv", flaskBackendPath);
    }

    console.log("Installing Python dependencies...");

    // Activate the virtual environment and install dependencies
    const pipCommand =
      process.platform === "win32"
        ? "venv\\Scripts\\pip install -r requirements.txt"
        : "venv/bin/pip3 install -r requirements.txt";

    await runCommand(pipCommand, flaskBackendPath);

    // Get Google API Key from user
    const googleApiKey = await askQuestion("Enter your Google API Key: ");

    // Generate a secure secret key for JWT
    console.log("\nGenerating a secure secret key for JWT authentication...");
    const secretKey = generateSecureKey();
    console.log("Secret key generated successfully!");

    // Save both keys to .env
    const envFilePath = path.join(flaskBackendPath, ".env");
    const envContent = `GOOGLE_API_KEY=${googleApiKey}\nSECRET_KEY=${secretKey}\n`;

    // Write the .env file (overwrite if exists)
    fs.writeFileSync(envFilePath, envContent);
    console.log("Environment variables have been saved to flask-backend/.env");

    console.log("\nSetup completed successfully!");
    console.log("Note: Keep your .env file secure and never commit it to version control.");
  } catch (error) {
    console.error("Setup failed:", error);
  }
}

setupProject();
