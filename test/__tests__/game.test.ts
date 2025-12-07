import Phaser from 'phaser';
import { GameConfig } from '../../src/config/game-config';

describe('Game Configuration', () => {
  test('should have correct width and height', () => {
    expect(GameConfig.width).toBe(360);
    expect(GameConfig.height).toBe(640);
  });

  test('should use Phaser.AUTO renderer', () => {
    expect(GameConfig.type).toBe(Phaser.AUTO);
  });

  test('should have physics enabled', () => {
    expect(GameConfig.physics).toBeDefined();
    expect(GameConfig.physics?.default).toBe('arcade');
  });
});
