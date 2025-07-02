# Incident Response Playbook: Device Trust & PQC Fallback Events

**Maintainer:** Ronak (CTO)  
**Last Updated:** July 3, 2025  
**Scope:** Device fingerprinting failures, PQC fallback behavior, trust bypasses  
**Audience:** Engineering, Security Operations, Compliance  

---

## 🚨 Incident Severity Levels

| Severity | Description | Response Time | Stakeholders |
|----------|-------------|---------------|--------------|
| **P0** | Device spoof leads to unauthorized access or trust bypass | Immediate (<15 min) | CTO, Security, Legal |
| **P1** | Multiple PQC fallbacks within a short window | 2h triage | Infra Lead, PQC Ops |
| **P2** | Drift in device fingerprints triggers false negatives | 24h review | QA, UX Engineering |

---

## 🔁 Detection Triggers

- 📉 Excessive `CryptoFallbackTelemetry` events (`>3 fallbacks/hour`)
- 🔁 Reused or replayed PQC device certificates
- 🧯 Trust level downgrade on verified device (e.g., full → basic)
- 🧪 Fingerprint drift > threshold without account recovery flow
- 👥 Multiple users with overlapping fingerprint entropy (collision)

---

## 🪵 Telemetry Flags

| Event | Emitter | Payload |
|-------|---------|---------|
| `TRACE.DEVICE_TRUST_FAILURE` | `trust.service.ts` | userId, fingerprint, flowStage, reason |
| `TRACE.PQC_FALLBACK_USED` | `cryptoFallback.ts` | alg, cause, decisionPath, duration |
| `WARN.DEVICE_REPLAY_ATTEMPT` | `auth.guard.ts` | certFingerprint, userId, timestamp |
| `INFO.TRUST_LEVEL_CHANGED` | `device-trust.service.ts` | deviceId, from → to, actor |

---

## 📘 Response Playbooks

### 🛡️ P0 – Trust Bypass or Replay

1. 🔒 Lock account temporarily  
2. 🧪 Invalidate device certs for affected user  
3. 📜 Snapshot logs to secure archive  
4. 🔁 Trigger PQC key rotation  
5. 📩 Notify user & provide device audit page  
6. 🧑‍⚖️ Notify Legal & file SOC2 anomaly report

---

### ⚠️ P1 – Fallback Burst

1. 📉 Review fallback telemetry window  
2. 🔁 Check `fallbackReason` histogram (PQ cert expired? Alg mismatch?)  
3. 🧠 Compare entropy of affected fingerprints  
4. ⚙️ Adjust fallback limits if safe  
5. 📤 Report to #trust-ops + annotate Grafana board

---

### 🚧 P2 – Fingerprint Drift

1. 📘 Pull sample logs with `flowStage: "validate"`  
2. 🧪 Recalculate fingerprint entropy and deviation score  
3. 🤝 If false positive, tune drift thresholds  
4. 🪛 Update trust scoring weights if needed  
5. 💬 Optional UX patch if triggered by browser fingerprint instability

---

## 🧭 Recovery & Mitigation

| Scenario | Action |
|----------|--------|
| Replay attempt | Block session, force re-auth |
| Cert mismatch | Prompt re-verification or re-registration |
| PQC fallback spike | Rotate keys, reduce expiration window |
| False fingerprint drift | Smooth weight vector or issue session override |

---

## 📄 Compliance & Follow-Up

- Create postmortem in `docs/postmortems/YYYY-MM-DD-{incident-type}.md`
- Link to corresponding Prometheus/Grafana snapshot
- Log incident ID in `trust/audit-log.md`
- File Jira ticket with label `incident-trust`
- Review fallback logic and certificate TTL in next sprint retro

---
