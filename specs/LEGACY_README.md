# Legacy Implementation & New Architecture Plan

This branch (`revamp`) marks a complete architectural overhaul of the browser extension. The previous implementation has been removed to start fresh with a more robust, efficient, and intelligent design.

## Summary of Previous Design & Shortcomings

The initial approach was a simpler browser extension focused on logging browsing activity. While functional, it lacked the sophisticated data processing and efficiency required for the project's long-term goals. Key discussions revealed a need to move beyond simple logging to a system capable of generating meaningful insights with minimal resource cost.

## The New Architecture: A Multi-Tiered Data Pipeline

The new implementation is based on a detailed specification that re-architects the extension around a cost-conscious, multi-stage data processing pipeline. The core goal is to minimize resource usage (CPU, storage, memory) while maximizing the value of the collected data.

### Key Concepts of the New Design:

1.  **Event-Driven Core:** The system is built around capturing a stream of `CoreEvent` objects (`CREATE`, `ACTIVATE`, `NAVIGATE`, `HEARTBEAT`, `CLOSE`). This event-based approach provides the rich contextual data needed for smart rediscovery, rather than just storing a simple list of URLs.

2.  **Triage System:** Not all data is treated equally. A triage system classifies events as high-value or low-value based on a combination of:
    *   **Domain Value:** User-defined rules for important or distracting domains.
    *   **Behavioral Value:** The system intelligently identifies user intent, such as flagging a long-neglected tab as a "saved for later" item, which is a high-value behavior.

3.  **Multi-Tiered Storage:** The extension uses different storage mechanisms for different types of data to optimize cost and performance:
    *   **Tier 1 (Raw):** `IndexedDB` for high-volume, temporary storage of high-value raw events with a 48-hour Time-To-Live (TTL).
    *   **Tier 2 (Session):** `chrome.storage.local` for medium-term storage of per-tab aggregated data.
    *   **Tier 3 (Insights):** `chrome.storage.sync` for permanent storage of small, daily insight summaries.

4.  **On-Device Aggregation:** The extension acts as the first stage of the insight-creation process. It pre-processes data on the client-side, creating `TabAggregate` and `DailyInsight` objects. This significantly reduces the amount of data that needs to be synced to a backend, saving bandwidth and server-side processing costs.

5.  **Cost-Control Mechanisms:** The design includes several features to ensure the extension is a "good citizen" on the user's machine:
    *   **Value-Based Sampling:** Reducing the capture rate for non-critical websites.
    *   **Intelligent Heartbeats:** Adapting the frequency of activity checks based on whether the user is active or idle.
    *   **Resource Budgeting:** Setting hard limits on storage and CPU usage.

### Implementation Plan

The implementation will follow a phased approach:

*   **Phase 1: Core Tracking (MVP):** Build the foundational data pipeline.
    1.  Set up the basic extension manifest and background script.
    2.  Implement tab event listeners (`onCreated`, `onActivated`, etc.).
    3.  Create an in-memory buffer for batching events.
    4.  Set up IndexedDB for raw event storage with a basic TTL.
    5.  Use `chrome.alarms` for reliable, periodic writes.

*   **Phase 2: Value-Added Processing:** Implement the "smart" logic.
    1.  Build the triage system for sampling and value-based filtering.
    2.  Implement the `TabAggregate` logic to summarize tab activity.
    3.  Introduce intelligent heartbeats using the `chrome.idle` API.
    4.  Generate and store `DailyInsight` objects in `chrome.storage.sync`.

*   **Phase 3: Advanced Insights & UI:** Deliver the value to the user.
    1.  Build a mechanism to sync the processed data to a backend app.
    2.  Integrate with an LLM on the backend to generate insights from the data.
    3.  Create a user-facing popup/dashboard to display the insights.

This new architecture will result in a highly efficient, scalable, and intelligent browser extension capable of delivering powerful, personalized insights into a user's browsing habits.
