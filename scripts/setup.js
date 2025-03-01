const { exec } = require("child_process");
const fs = require("fs");
const readline = require("readline");
const path = require("path");

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

    const googleApiKey = await askQuestion("Enter your Google API Key: ");

    const envFilePath = path.join(flaskBackendPath, ".env");
    const envContent = `GOOGLE_API_KEY=${googleApiKey}\n`;

    fs.writeFileSync(envFilePath, envContent, { flag: "a" });
    console.log("Google API Key has been saved to flask-backend/.env");

    console.log("Setup completed successfully!");
  } catch (error) {
    console.error("Setup failed:", error);
  }
}

setupProject();
