export async function Perform(handler: Function, params: any[], attempts: number) {

  let error: Error;
  let count = 0;

  while(count < attempts) {
    try {
      return await handler(...params);
    } catch (err) {
      count++;
      error = err;
    }
  }

  throw error;
}

export function PerformSync(handler: Function, params: any[], attempts: number) {

  let error: Error;
  let count = 0;

  while(count < attempts) {
    try {
      return handler(...params);
    } catch (err) {
      count++;
      error = err;
    }
  }

  throw error;
}