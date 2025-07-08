
import asyncio
from temporalio.client import Client
from temporalio.worker import Worker

from temporal_workflow import GreetingWorkflow, say_hello

async def main():
    client = await Client.connect("localhost:7233")

    worker = Worker(
        client,
        task_queue="hello-task-queue",
        workflows=[GreetingWorkflow],
        activities=[say_hello],
    )
    await worker.run()

if __name__ == "__main__":
    asyncio.run(main())
