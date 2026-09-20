# GhostQueue

Human Process Abandonment Intelligence.

Find where people disappear. Understand why. Test what could change.

## Stack
- Frontend: Next.js + TypeScript + Tailwind CSS + shadcn/ui + Recharts + Framer Motion
- Backend: Python + FastAPI + Pandas + NumPy + Pydantic
- AWS: S3, API Gateway, Lambda, DynamoDB, Amazon Bedrock, Amplify Hosting
- Infrastructure: AWS SAM

## Development order
1. Real dataset ingestion
2. Analytics engine
3. Dashboard vertical slice
4. AWS integration
5. Bedrock investigation
6. Custom dataset privacy workflow
7. Simulation
8. Polish and demo

## Privacy principle
Raw custom datasets must not be persisted in the application database. Temporary uploads are processed and deleted after analysis. Do not log raw rows or sensitive fields.
