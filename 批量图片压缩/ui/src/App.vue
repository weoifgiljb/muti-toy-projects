<template>
  <div class="app">
    <div class="app__glow"></div>
    <div class="app__noise"></div>

    <header class="app__header">
      <div class="app__brand">
        <span class="app__badge">Batch Image Compressor</span>
        <h1 class="app__title">Precision Compression Console</h1>
        <p class="app__subtitle">
          Industrial-grade compression with controllable quality and PNG
          quantization.
        </p>
      </div>
      <div class="app__status" :class="`app__status--${status}`">
        <span class="app__status-dot"></span>
        <span class="app__status-text">{{ statusLabel }}</span>
      </div>
    </header>

    <main class="app__grid">
      <section class="panel panel--drop" style="--delay: 0s">
        <div class="panel__header">
          <span>Source Folder</span>
          <span class="panel__meta">Input pipeline</span>
        </div>
        <div class="panel__body">
          <div
            class="dropzone"
            :class="{ 'dropzone--active': isDropActive }"
            @click="handleSelectFolder"
            @dragenter="handleDragEnter"
            @dragover="handleDragOver"
            @dragleave="handleDragLeave"
            @drop="handleDrop"
          >
            <div class="dropzone__icon">[]</div>
            <div class="dropzone__text">Choose a folder</div>
            <div class="dropzone__hint">Drop or click to browse</div>
          </div>

          <div class="folder">
            <div class="folder__label">Selected</div>
            <div class="folder__path">
              {{ folderPath || "None" }}
            </div>
          </div>

          <div class="panel__actions">
            <button
              class="btn btn--primary"
              :disabled="isBusy || !folderPath"
              @click="handleStart"
            >
              Start Compression
            </button>
            <button
              class="btn btn--ghost"
              :disabled="isBusy"
              @click="clearLogs"
            >
              Clear Log
            </button>
          </div>
        </div>
      </section>

      <section class="panel panel--controls" style="--delay: 0.08s">
        <div class="panel__header">
          <span>Quality Controls</span>
          <span class="panel__meta">Adjust fidelity</span>
        </div>
        <div class="panel__body">
          <div class="control">
            <div class="control__header">
              <span class="control__label">JPEG / WebP Quality</span>
              <span class="control__value">{{ quality }}</span>
            </div>
            <input
              class="control__range"
              type="range"
              min="1"
              max="95"
              step="1"
              v-model.number="quality"
            />
          </div>

          <div class="control control--split">
            <div class="control__column">
              <label class="toggle">
                <input
                  class="toggle__input"
                  type="checkbox"
                  v-model="pngLossy"
                />
                <span class="toggle__track"></span>
                <span class="toggle__label">Lossy PNG (quantize)</span>
              </label>
              <label class="toggle">
                <input
                  class="toggle__input"
                  type="checkbox"
                  v-model="keepMetadata"
                />
                <span class="toggle__track"></span>
                <span class="toggle__label">Keep metadata</span>
              </label>
              <label class="toggle">
                <input
                  class="toggle__input"
                  type="checkbox"
                  v-model="copyOthers"
                />
                <span class="toggle__track"></span>
                <span class="toggle__label">Copy non-image files</span>
              </label>
              <label class="toggle">
                <input
                  class="toggle__input"
                  type="checkbox"
                  v-model="dryRun"
                />
                <span class="toggle__track"></span>
                <span class="toggle__label">Dry run only</span>
              </label>
            </div>
            <div class="control__column">
              <div class="control__label control__label--tight">
                PNG Palette Size
              </div>
              <input
                class="control__input"
                type="number"
                min="2"
                max="256"
                step="1"
                v-model="pngColors"
                :disabled="!pngLossy"
              />
              <div class="control__note">
                Leave empty to map from quality.
              </div>
              <div class="control__note control__note--accent">
                Output folder: &lt;source&gt;_compressed
              </div>
            </div>
          </div>
        </div>
      </section>

      <section class="panel panel--log" style="--delay: 0.16s">
        <div class="panel__header">
          <span>Activity Log</span>
          <span class="panel__meta">System output</span>
        </div>
        <div class="panel__body panel__body--log">
          <div v-if="logLines.length" class="log">
            <div v-for="(line, index) in logLines" :key="index" class="log__line">
              {{ line }}
            </div>
          </div>
          <div v-else class="log log--empty">
            No activity yet. Select a folder and run compression.
          </div>
        </div>
      </section>
    </main>

    <footer class="app__footer">
      <div class="app__footer-note">
        Desktop API: <strong>{{ isDesktop ? "Connected" : "Unavailable" }}</strong>
      </div>
      <div class="app__footer-note">
        Status channel stays open while compression is running.
      </div>
    </footer>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from "vue";

const folderPath = ref("");
const quality = ref(75);
const pngLossy = ref(false);
const pngColors = ref("");
const keepMetadata = ref(false);
const copyOthers = ref(false);
const dryRun = ref(false);
const status = ref("idle");
const logLines = ref([]);
const isDropActive = ref(false);

const isDesktop = ref(false);
const isBusy = computed(() => status.value === "running");

const statusLabel = computed(() => {
  if (status.value === "running") return "Running";
  if (status.value === "done") return "Completed";
  if (status.value === "error") return "Error";
  return "Idle";
});

const appendLog = (line) => {
  const next = [...logLines.value, line].slice(-250);
  logLines.value = next;
};

const clearLogs = () => {
  logLines.value = [];
};

const handleSelectFolder = async () => {
  if (isBusy.value) return;
  if (!isDesktop.value) {
    appendLog("Desktop API not available. Run gui.py to enable.");
    return;
  }
  const picked = await window.pywebview.api.select_folder();
  if (picked) {
    folderPath.value = picked;
    appendLog(`Selected: ${picked}`);
  }
};

const handleStart = async () => {
  if (isBusy.value || !folderPath.value) return;
  if (!isDesktop.value) {
    appendLog("Desktop API not available. Run gui.py to enable.");
    return;
  }
  const payload = {
    folder: folderPath.value,
    quality: Number(quality.value),
    pngLossy: pngLossy.value,
    pngColors: pngColors.value ? Number(pngColors.value) : 0,
    keepMetadata: keepMetadata.value,
    copyOthers: copyOthers.value,
    dryRun: dryRun.value,
  };
  const response = await window.pywebview.api.start_compression(payload);
  if (!response?.ok) {
    status.value = "error";
    appendLog(`[ERROR] ${response?.message || "Unknown error"}`);
  }
};

const handleDragEnter = (event) => {
  event.preventDefault();
  isDropActive.value = true;
};

const handleDragOver = (event) => {
  event.preventDefault();
  isDropActive.value = true;
};

const handleDragLeave = (event) => {
  event.preventDefault();
  isDropActive.value = false;
};

const handleDrop = (event) => {
  event.preventDefault();
  isDropActive.value = false;
  const file = event.dataTransfer?.files?.[0];
  const path = file?.path || "";
  if (path) {
    folderPath.value = path;
    appendLog(`Selected: ${path}`);
  } else {
    appendLog("Drag-drop path unavailable. Use browse.");
  }
};

onMounted(() => {
  if (window.pywebview?.api) {
    isDesktop.value = true;
  } else {
    window.addEventListener("pywebviewready", () => {
      isDesktop.value = true;
    });
  }

  window.__addLog = (line) => appendLog(line);
  window.__setStatus = (next) => {
    status.value = next;
  };
});
</script>
