// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    // Load environment variables from .env file at the start
    // Allow failure if .env doesn't exist (e.g., in production build without .env)
    match dotenvy::dotenv() {
        Ok(path) => println!("Loaded .env file from: {:?}", path),
        Err(_) => {
            println!("No .env file found or failed to load. Using system environment variables.")
        }
    };
    vaiced_tauri_lib::run()
}
