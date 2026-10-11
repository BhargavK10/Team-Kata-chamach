#### Domain: Fintech

# Automated Corporate Risk Radar

## Background

Financial analysts spend hours reading hundreds of public regulatory complaints, earnings call transcripts, and news items to spot companies heading into trouble. Most of this material is unstructured and noisy, and the few items that signal serious legal or operational risk are easy to miss. By the time a pattern is noticed, the risk may already have escalated.

## Challenge

Build an Automated Corporate Risk Radar: an end-to-end system that takes a continuous stream of raw complaint and news text, identifies what is genuinely high-risk, and shows analysts in real time how each company’s risk profile is changing and why.

## Expected Capabilities

-   Ingest a continuous stream of unstructured news and complaint text about multiple companies.
-   Flag items that point to serious legal, operational, or compliance threats, and separate them from general noise.
-   Compute a rolling Corporate Risk Index for each company that moves as new information arrives.
-   Explain in plain language why a company’s risk is rising, supported by relevant context from that company’s history.
-   Display a live Risk Scoreboard dashboard covering five target companies.

## Desired Outcome

An analyst can open one screen, see which companies are becoming riskier, and understand the reasons within seconds, without reading the underlying documents.

## Evaluation Focus

|Area|What judges look for|
|--|--|
|Detection quality|How well high-risk items are separated from routine or irrelevant text|
|Context and explanation|Whether a newly flagged risk comes with accurate, history-aware reasoning|
|Risk index design|Whether the index is meaningful, responsive, and easy to interpret|
|Dashboard and usability|Clarity, live updating, and how quickly an analyst can act on it|