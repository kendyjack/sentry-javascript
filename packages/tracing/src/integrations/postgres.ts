import { getSpan } from '@sentry/scope';
import { Integration } from '@sentry/types';
import { dynamicRequire, fill, logger } from '@sentry/utils';

interface PgClient {
  prototype: {
    query: () => void | Promise<unknown>;
  };
}

/** Tracing integration for node-postgres package */
export class Postgres implements Integration {
  /**
   * @inheritDoc
   */
  public static id: string = 'Postgres';

  /**
   * @inheritDoc
   */
  public name: string = Postgres.id;

  /**
   * @inheritDoc
   */
  public setupOnce(): void {
    let client: PgClient;

    try {
      const pgModule = dynamicRequire(module, 'pg') as { Client: PgClient };
      client = pgModule.Client;
    } catch (e) {
      logger.error('Postgres Integration was unable to require `pg` package.');
      return;
    }

    /**
     * function (query, callback) => void
     * function (query, params, callback) => void
     * function (query) => Promise
     * function (query, params) => Promise
     */
    fill(client.prototype, 'query', function(orig: () => void | Promise<unknown>) {
      return function(this: unknown, config: unknown, values: unknown, callback: unknown) {
        const parentSpan = getSpan();
        const span = parentSpan?.startChild({
          description: typeof config === 'string' ? config : (config as { text: string }).text,
          op: `db`,
        });

        if (typeof callback === 'function') {
          return orig.call(this, config, values, function(err: Error, result: unknown) {
            span?.finish();
            callback(err, result);
          });
        }

        if (typeof values === 'function') {
          return orig.call(this, config, function(err: Error, result: unknown) {
            span?.finish();
            values(err, result);
          });
        }

        return (orig.call(this, config, values) as Promise<unknown>).then((res: unknown) => {
          span?.finish();
          return res;
        });
      };
    });
  }
}
