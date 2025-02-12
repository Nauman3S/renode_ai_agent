FROM --platform=linux/arm64 antmicro/renode:latest as renode

# Create a script to copy files if they exist
RUN mkdir -p /tmp/renode-backup && \
    if [ -d "/tmp/renode-*" ]; then \
        cp -r /tmp/renode-* /tmp/renode-backup/; \
    fi

FROM --platform=linux/arm64 python:3.10-slim

WORKDIR /app

# Install minimal dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    mono-complete \
    python3-dev \
    screen \
    libc6-dev \
    gcc \
    g++ \
    make \
    libfdt-dev \
    pkg-config && \
    rm -rf /var/lib/apt/lists/*

# Copy the entire Renode installation from the official image
COPY --from=renode /usr/bin/renode /usr/bin/renode
COPY --from=renode /opt/renode /opt/renode
COPY --from=renode /tmp/renode-backup /tmp/renode-19

# Create necessary directories and set up libraries
RUN mkdir -p /opt/renode/lib/resources/libraries && \
    mkdir -p /tmp/renode-19 && \
    find /opt/renode -name "*.so" -exec cp {} /opt/renode/lib/resources/libraries/ \; && \
    find /opt/renode -name "translate-arm-m-le.so" -exec cp {} /tmp/renode-19/0-Antmicro.Renode.translate-arm-m-le.so \;

# Make sure the binary is executable
RUN chmod +x /usr/bin/renode

# Copy application files and install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Create necessary directories
RUN mkdir -p uploads logs

# Test Renode installation and show directory structure
RUN which renode && \
    ls -la /usr/bin/renode && \
    echo "Renode directory structure:" && \
    find /opt/renode -name "*.so" -type f && \
    echo "Libraries directory:" && \
    ls -la /opt/renode/lib/resources/libraries/ && \
    echo "Temp directory:" && \
    ls -la /tmp/renode-19/

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]