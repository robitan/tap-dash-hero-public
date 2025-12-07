import Phaser from 'phaser';

/**
 * Utility functions for handling image sizing and scaling in the game
 */
export class ImageUtils {
    /**
     * Scales an image to fit within a maximum width and height while maintaining aspect ratio
     * @param gameObject The Phaser game object to scale (Image, Sprite, etc.)
     * @param maxWidth Maximum width the image should occupy (default: game width * 0.8)
     * @param maxHeight Maximum height the image should occupy (default: game height * 0.8)
     * @param scaleMultiplier Optional multiplier to adjust the final scale (default: 1)
     * @returns The scaled game object for chaining
     */
    static scaleToFit(
        gameObject: Phaser.GameObjects.Image | Phaser.GameObjects.Sprite,
        maxWidth?: number,
        maxHeight?: number,
        scaleMultiplier: number = 1
    ): Phaser.GameObjects.Image | Phaser.GameObjects.Sprite {
        // Get the scene from the game object
        const scene = gameObject.scene;

        // If maxWidth or maxHeight are not provided, use default values
        maxWidth = maxWidth || scene.cameras.main.width * 0.8;
        maxHeight = maxHeight || scene.cameras.main.height * 0.8;

        // Reset scale to 1 to get original dimensions
        gameObject.setScale(1);

        // Calculate scale factors for width and height
        const scaleX = maxWidth / gameObject.width;
        const scaleY = maxHeight / gameObject.height;

        // Use the smaller scale factor to ensure the image fits within the bounds
        const scale = Math.min(scaleX, scaleY) * scaleMultiplier;

        // Apply the scale
        gameObject.setScale(scale);

        return gameObject;
    }

    /**
     * Scales an image to a specific percentage of the game's width or height
     * @param gameObject The Phaser game object to scale
     * @param widthPercent Percentage of game width (0-1)
     * @param heightPercent Percentage of game height (0-1)
     * @param maintainAspectRatio Whether to maintain the aspect ratio (default: true)
     * @returns The scaled game object for chaining
     */
    static scaleToScreenPercent(
        gameObject: Phaser.GameObjects.Image | Phaser.GameObjects.Sprite,
        widthPercent: number,
        heightPercent?: number,
        maintainAspectRatio: boolean = true
    ): Phaser.GameObjects.Image | Phaser.GameObjects.Sprite {
        const scene = gameObject.scene;
        const gameWidth = scene.cameras.main.width;
        const gameHeight = scene.cameras.main.height;

        // Reset scale to 1
        gameObject.setScale(1);

        // Calculate target dimensions
        const targetWidth = gameWidth * widthPercent;

        // If heightPercent is not provided, use widthPercent
        const targetHeight = heightPercent
            ? gameHeight * heightPercent
            : gameHeight * widthPercent;

        if (maintainAspectRatio) {
            // Calculate scale factors
            const scaleX = targetWidth / gameObject.width;
            const scaleY = targetHeight / gameObject.height;

            // Use the smaller scale factor to maintain aspect ratio
            const scale = Math.min(scaleX, scaleY);
            gameObject.setScale(scale);
        } else {
            // Scale width and height independently
            gameObject.setDisplaySize(targetWidth, targetHeight);
        }

        return gameObject;
    }

    /**
     * Sets the size of a game object relative to the game's dimensions
     * @param gameObject The Phaser game object to resize
     * @param widthPercent Percentage of game width (0-1)
     * @param heightPercent Percentage of game height (0-1)
     * @returns The resized game object for chaining
     */
    static setRelativeSize(
        gameObject: Phaser.GameObjects.Image | Phaser.GameObjects.Sprite,
        widthPercent: number,
        heightPercent: number
    ): Phaser.GameObjects.Image | Phaser.GameObjects.Sprite {
        const scene = gameObject.scene;
        const gameWidth = scene.cameras.main.width;
        const gameHeight = scene.cameras.main.height;

        const targetWidth = gameWidth * widthPercent;
        const targetHeight = gameHeight * heightPercent;

        gameObject.setDisplaySize(targetWidth, targetHeight);

        return gameObject;
    }

    /**
     * Creates a responsive sprite that is automatically sized relative to the game dimensions
     * @param scene The scene to add the sprite to
     * @param x X position
     * @param y Y position
     * @param texture Texture key
     * @param frame Frame name or index
     * @param widthPercent Percentage of game width (0-1)
     * @param maintainAspectRatio Whether to maintain the aspect ratio (default: true)
     * @returns The created sprite
     */
    static createResponsiveSprite(
        scene: Phaser.Scene,
        x: number,
        y: number,
        texture: string,
        frame?: string | number,
        widthPercent: number = 0.1,
        maintainAspectRatio: boolean = true
    ): Phaser.GameObjects.Sprite {
        const sprite = scene.add.sprite(x, y, texture, frame);
        return this.scaleToScreenPercent(sprite, widthPercent, undefined, maintainAspectRatio) as Phaser.GameObjects.Sprite;
    }

    /**
     * Creates a physics-enabled sprite that is automatically sized relative to the game dimensions
     * @param scene The scene to add the sprite to
     * @param x X position
     * @param y Y position
     * @param texture Texture key
     * @param frame Frame name or index
     * @param widthPercent Percentage of game width (0-1)
     * @param maintainAspectRatio Whether to maintain the aspect ratio (default: true)
     * @returns The created physics sprite
     */
    static createResponsivePhysicsSprite(
        scene: Phaser.Scene,
        x: number,
        y: number,
        texture: string,
        frame?: string | number,
        widthPercent: number = 0.1,
        maintainAspectRatio: boolean = true
    ): Phaser.Physics.Arcade.Sprite {
        // Create the physics sprite
        const sprite = scene.physics.add.sprite(x, y, texture, frame);

        // Scale it appropriately
        this.scaleToScreenPercent(sprite, widthPercent, undefined, maintainAspectRatio);

        return sprite;
    }
}
