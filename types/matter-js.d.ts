/* eslint-disable @typescript-eslint/no-explicit-any */
declare module 'matter-js' {
  namespace Matter {
    interface Vector {
      x: number;
      y: number;
    }

    interface Body {
      position: Vector;
      angle: number;
    }

    interface World {
      bodies: Body[];
    }

    interface Engine {
      world: World;
    }

    interface BodyOptions {
      isStatic?: boolean;
      restitution?: number;
      mass?: number;
      friction?: number;
      frictionAir?: number;
      angle?: number;
    }

    interface EngineCreateOptions {
      gravity?: { x?: number; y?: number; scale?: number };
    }

    const Engine: {
      create(options?: EngineCreateOptions): Engine;
      update(engine: Engine, delta?: number): void;
      clear(engine: Engine): void;
    };

    const Bodies: {
      rectangle(x: number, y: number, width: number, height: number, options?: BodyOptions): Body;
    };

    const Composite: {
      add(world: World, body: Body | Body[]): void;
    };

    // eslint-disable-next-line @typescript-eslint/no-shadow
    const Body: {
      setVelocity(body: Body, velocity: Vector): void;
    };
  }

  export = Matter;
}
