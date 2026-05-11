FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

ENV PERF_HOST=0.0.0.0
ENV PERF_PORT=5175

EXPOSE 5175

CMD ["python", "server.py"]
