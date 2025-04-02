const { exec } = require("child_process");

// Parse command line arguments
const args = process.argv.slice(2);
const isTestMode = args.includes('--test');

// Log the mode we're starting in
console.log(`Starting application in ${isTestMode ? 'TEST' : 'NORMAL'} mode`);

// Function to run shell commands
function runCommand(command, cwd) {
  return new Promise((resolve, reject) => {
    // For Expo, we need to set the environment variable differently
    const isExpoCommand = command.includes('expo');
    const env = {
      ...process.env,
      TEST_MODE: isTestMode ? 'true' : 'false',
      // For Expo, we also set it in the command itself
      ...(isExpoCommand ? {
        EXPO_PUBLIC_TEST_MODE: isTestMode ? 'true' : 'false'
      } : {})
    };

    // For Expo, we modify the command to include the environment variable
    const finalCommand = isExpoCommand 
      ? `TEST_MODE=${isTestMode ? 'true' : 'false'} ${command}`
      : command;

    const childProcess = exec(finalCommand, { 
      cwd,
      env
    });

    childProcess.stdout.on("data", (data) => {
      console.log(`[${cwd}] ${data}`);
    });

    childProcess.stderr.on("data", (data) => {
      console.error(`[${cwd}] ${data}`);
    });

    childProcess.on("close", (code) => {
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
  const flaskBackendPath = "./flask-backend";
  const pythonCommand =
    process.platform === "win32"
      ? `venv\\Scripts\\python app.py ${isTestMode ? '--test' : ''}`
      : `venv/bin/python3 app.py ${isTestMode ? '--test' : ''}`;

  return runCommand(pythonCommand, flaskBackendPath);
}

// Function to start the Expo app
function startExpoApp() {
  return runCommand("npx expo start", "./");
}

async function startProject() {
  try {
    console.log(`Starting Flask backend and Expo app...${isTestMode ? ' (Test Mode)' : ''}`);
    await Promise.all([startFlaskBackend(), startExpoApp()]);
  } catch (error) {
    console.error("Failed to start project:", error);
    process.exit(1);
  }
}

startProject();
