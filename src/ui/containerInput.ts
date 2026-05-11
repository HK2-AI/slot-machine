import Phaser from 'phaser';

/**
 * setInteractive shim for top-level Containers.
 *
 * Phaser 3.90's hit-test for objects without a parentContainer uses:
 *   localX = pointer.x - obj.x + obj.scaleX * obj.displayOriginX
 * For a Container, displayOrigin defaults to (width/2, height/2) — but
 * Container rendering does NOT use origin, so its visual center stays at
 * local (0, 0). Result: clicks land at (w/2, h/2) in hit-test space,
 * missing any hit area drawn around (0, 0). Shift the hit area by the
 * displayOrigin to compensate.
 *
 * Nested containers use the worldTransform branch and don't need this.
 */
export function enableContainerInput(
  c: Phaser.GameObjects.Container,
  hitArea: Phaser.Geom.Circle | Phaser.Geom.Rectangle,
  callback: Phaser.Types.Input.HitAreaCallback,
): void {
  c.setInteractive(hitArea, callback);
  const dox = (c.width || 0) / 2;
  const doy = (c.height || 0) / 2;
  hitArea.x += dox;
  hitArea.y += doy;
}
