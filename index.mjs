import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  QueryCommand,
  DeleteCommand,
} from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const TABLE = process.env.NOTES_TABLE || "Notes";

export const handler = async (event) => {
  console.log("HANDLER EVENT:", JSON.stringify(event));

  const { rawPath, queryStringParameters } = event;
  const httpMethod = event.requestContext?.http?.method;
  const qp = queryStringParameters || {};

  // GET /notes?userId=SUB  → Query by userId
  if (httpMethod === "GET" && rawPath === "/notes") {
    const userId = qp.userId;
    if (!userId) {
      return { statusCode: 400, body: JSON.stringify({ error: "userId query param is required" }) };
    }

    const result = await docClient.send(
      new QueryCommand({
        TableName: TABLE,
        KeyConditionExpression: "userId = :uid",
        ExpressionAttributeValues: { ":uid": userId },
        ScanIndexForward: false,
      })
    );

    return { statusCode: 200, body: JSON.stringify(result.Items || []) };
  }

  // POST /notes  (body: { text, userId })
  if (httpMethod === "POST" && rawPath === "/notes") {
    const body = JSON.parse(event.body || "{}");
    const { text, userId } = body;

    if (!text || !userId) {
      return { statusCode: 400, body: JSON.stringify({ error: "text and userId are required" }) };
    }

    const id =
      (globalThis.crypto && globalThis.crypto.randomUUID?.()) ||
      (typeof crypto !== "undefined" && crypto.randomUUID?.()) ||
      String(Date.now());

    const item = {
      userId,  // PK
      id,      // SK
      text,
      createdAt: Date.now(),
    };

    await docClient.send(new PutCommand({ TableName: TABLE, Item: item }));
    return { statusCode: 201, body: JSON.stringify(item) };
  }

  // GET /notes/:id  (requires ?userId=SUB)
  if (httpMethod === "GET" && /^\/notes\/\w+/.test(rawPath)) {
    const id = rawPath.split("/")[2];
    const userId = qp.userId;
    if (!userId) {
      return { statusCode: 400, body: JSON.stringify({ error: "userId query param is required" }) };
    }

    const result = await docClient.send(
      new GetCommand({ TableName: TABLE, Key: { userId, id } })
    );

    return result.Item
      ? { statusCode: 200, body: JSON.stringify(result.Item) }
      : { statusCode: 404, body: JSON.stringify({ error: "Note not found" }) };
  }

  // DELETE /notes/:id  (requires ?userId=SUB)
  if (httpMethod === "DELETE" && /^\/notes\/\w+/.test(rawPath)) {
    const id = rawPath.split("/")[2];
    const userId = qp.userId;
    if (!userId) {
      return { statusCode: 400, body: JSON.stringify({ error: "userId query param is required" }) };
    }

    await docClient.send(
      new DeleteCommand({ TableName: TABLE, Key: { userId, id } })
    );

    return { statusCode: 200, body: JSON.stringify({ message: "Note deleted" }) };
  }

  return { statusCode: 400, body: JSON.stringify({ error: "Unsupported route" }) };
};
