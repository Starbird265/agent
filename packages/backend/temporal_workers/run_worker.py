import asyncio
import sys
from pathlib import Path
import os

# Add the parent directory to the path to allow direct imports
sys.path.append(str(Path(__file__).parent.parent))

from temporalio.client import Client
from temporalio.worker import Worker

from temporal_workers.temporal_workflow import GreetingWorkflow, say_hello

async def main():
    # Make the Temporal server URL configurable via TEMPORAL_SERVER_URL, defaulting to localhost:7233
    temporal_url = os.getenv("TEMPORAL_SERVER_URL", "localhost:7233")
    client = await Client.connect(temporal_url)

    worker = Worker(
        client,
        task_queue="hello-task-queue",
        workflows=[GreetingWorkflow],
        activities=[say_hello],
    )
    await worker.run()

if __name__ == "__main__":
    asyncio.run(main())
