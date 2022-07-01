import { mkdirSync } from 'fs';

export default async function initApplicationWorkpace(workspace: string): Promise<void> {
  try {
    mkdirSync(workspace, { recursive: true });
  } catch (error) {
    throw new Error(`Can't create application workspace folder: ${error}`);
  }
}
