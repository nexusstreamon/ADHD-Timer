# ⏱️ ADHD Timer — Visual Focus Companion

[![Deploy to GitHub Pages](https://github.com/nexusstreamon/ADHD-Timer/actions/workflows/deploy.yml/badge.svg)](https://github.com/nexusstreamon/ADHD-Timer/actions/workflows/deploy.yml)
[![Live Demo](https://img.shields.io/badge/Live-Demo-brightgreen?style=flat-square)](https://nexusstreamon.github.io/ADHD-Timer/)

> **Time is abstract. ADHD Timer makes it physical.**

The **ADHD Timer** is an elegant, visual countdown stopwatch designed specifically to combat **time blindness**—a common executive dysfunction trait where time feels invisible or non-existent. By representing remaining time as a diminishing, vibrant graphic disk rather than cold, anxious counting numbers, this timer helps you build an intuitive, stress-free relationship with your focus sessions.

🔗 **Access the Live Application here:**  
👉 **[https://nexusstreamon.github.io/ADHD-Timer/](https://nexusstreamon.github.io/ADHD-Timer/)**

---

## ✨ Key Features

### 🔴 1. Minimalist Visual Disk
* **Zero Anxiety Countdown**: A clean, beautifully colored segment representing time that smoothly vanishes as the clock ticks down.
* **Interactive Adjustments**: Click and drag directly on the watch face to set your time instantly. 

### ⚙️ 2. Web-Worker Armed Background Precision (New!)
* **Tab-Proof Alerts**: Normal browsers pause or throttle timers when you switch tabs, causing standard web alarms to fail. Our timer utilizes an isolated **Web Worker** thread.
* **Reliable Alarms**: The alarm triggers and rings **every single time** the countdown finishes, even if you are working in other browser tabs or have minimized the application.

### 🏷️ 3. Live Tab Title Countdown (New!)
* **At-a-Glance Monitoring**: Displays a clean `(MM:SS)` countdown timer directly inside the browser tab title (Chrome, Safari, Edge, Firefox).
* **Zero Interruption**: Monitor how much time remains without switching away from your active workspace.

### 🎨 4. Sensory-Friendly Presets & Sounds
* **Custom ADHD Profiles**: Choose between gentle ticking backgrounds or absolute silence to preserve hyperfocus.
* **Warm Alarm Signals**: Carefully selected, warm sound frequencies that alert without triggering startle responses or sensory overload.
* **Automatic Dark & Light Theme**: Seamlessly adapts to your system preferences or browser configuration for eye comfort.

---

## 🛠️ How It Works (For ADHD Minds)

For neurodivergent individuals, traditional digital clocks or timers with ticking seconds can trigger high anxiety or be easily forgotten once out of active sight.

1. **Physicalizing Time**: By seeing a block of space (the red/colored wedge) shrink, your brain processes the transition of time **spatially** rather than **numerically**.
2. **Background Consistency**: Knowing that the alarm will ring regardless of what tab you are currently reading removes the urge to continuously check back and interrupt your work.
3. **Tab Tracking**: The clean tab label provides immediate reassurance of how much time is left without breaking your flow.

---

## 🚀 Tech Stack & Core Technologies

* **Framework**: React 18+ with TypeScript
* **Build System**: Vite (configured with relative base paths for seamless single-page GitHub Pages deployment)
* **Styling**: Tailwind CSS (with clean layout, spacing, and fluid typography)
* **Background Threading**: Vanilla Web Workers API for reliable, non-throttled time calculation
* **Icons**: Lucide React
* **Deployment**: Automated GitHub Actions Workflow (configured on `main` branch)

---

## 💻 Local Development

If you'd like to run or modify this project locally on your machine:

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/nexusstreamon/ADHD-Timer.git
   cd ADHD-Timer
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Run the Development Server**:
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000` (or the local port provided in your terminal) to view the app!

4. **Build for Production**:
   ```bash
   npm run build
   ```

---

## 🚀 Automated GitHub Pages Deployment

The project is pre-packaged with a complete GitHub Actions Workflow in `.github/workflows/deploy.yml` which deploys the application automatically whenever changes are pushed to your default branch.

Enjoy using your new **ADHD Timer** and mastering your focus sessions! 🚀
