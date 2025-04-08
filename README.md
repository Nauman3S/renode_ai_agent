# Renode AI Agent

Renode AI Agent is a powerful assistant designed to make working with [Renode](https://renode.io/) easier and more efficient. It uses AI to analyze Renode project files, identify potential issues, and provide a conversational interface for interacting with your Renode setup.

## Motivation

This project was created out of necessity — public documentation for Renode can be sparse or unclear. Renode AI Agent aims to bridge that gap by offering smart insights and intuitive interactions.

## Features

- Analyze Renode project files to detect errors and inconsistencies.
- Execute the project and gather the logs.
- Understand the structure and flow of your Renode setup.
- Chat with your Renode project and logs using a natural language interface.
- Easily run using Docker Compose.
- Deployable on platforms like CapRover or similar.

## Project Files

The Renode AI Agent interacts with and analyzes the following typical Renode project files and can excute the project to get the logs:

- `*.resc` – Renode script files used for setting up emulation environments.
- `*.repl` – Peripheral definition files.
- `*.robot` – Robot Framework test files for simulation automation.
- `platforms/*.repl` – Hardware platform definitions.

## Getting Started

### Run with Docker Compose

```bash
docker-compose up --build
```

### Deploy to CapRover

You can also deploy this project to CapRover or a similar container platform. Just push your code to a connected repo and configure the container using the provided `Dockerfile` and `docker-compose.yml`.

## License

MIT License

---

This project is not officially affiliated with Renode or Antmicro.
