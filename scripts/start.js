const { exec } = require("child_process");

// Function to run shell commands
function runCommand(command, cwd) {
  return new Promise((resolve, reject) => {
    const process = exec(command, { cwd });

    process.stdout.on("data", (data) => {
      console.log(`[${cwd}] ${data}`);
    });

    process.stderr.on("data", (data) => {
      console.error(`[${cwd}] ${data}`);
    });

    process.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(`Process exited with code ${code}`);
      }
    });
  });
}

// Function to start the Flask backend
function startFlaskBackend() {
  return runCommand("python app.py", "./flask-backend");
}

// Function to start the Expo app
function startExpoApp() {
  return runCommand("npx expo start", "./");
}

async function startProject() {
  try {
    console.log("Starting Flask backend and Expo app...");
    await Promise.all([startFlaskBackend(), startExpoApp()]);
  } catch (error) {
    console.error("Failed to start project:", error);
  }
}

startProject();
