import sys
import pygame
import os
import random

pygame.init()
# Включаем музыку, на зацикливание
pygame.mixer.music.load('assets/music/soundtrack.ogg')
pygame.mixer.music.play(loops=-1)

# Получаем константы, находим разрешение экрана и включаем игру на полный экран
SCREEN_HEIGHT = pygame.display.Info().current_h
SCREEN_WIDTH = pygame.display.Info().current_w
SCREEN = pygame.display.set_mode((SCREEN_WIDTH, SCREEN_HEIGHT), pygame.FULLSCREEN)

# Подгружаем картинки
START = pygame.image.load(os.path.join("assets/image/grogu", "grogu_start.png"))
RUNNING = [pygame.image.load(os.path.join("assets/image/grogu", "grogu_run_1.png")),
           pygame.image.load(os.path.join("assets/image/grogu", "grogu_run_2.png"))]
JUMPING = pygame.image.load(os.path.join("assets/image/grogu", "grogu_jump.png"))
BEND_DOWN = [pygame.image.load(os.path.join("assets/image/grogu", "grogu_down_1.png")),
             pygame.image.load(os.path.join("assets/image/grogu", "grogu_down_2.png"))]
DEAD = pygame.image.load(os.path.join("assets/image/grogu", "grogu_dead.png"))
SMALL_ENEMIES = [pygame.image.load(os.path.join("assets/image/enemies", "jawa.png")),
                 pygame.image.load(os.path.join("assets/image/enemies", "trooper.png"))]
BIG_ENEMIES = [pygame.image.load(os.path.join("assets/image/enemies", "droid.png")),
               pygame.image.load(os.path.join("assets/image/enemies", "gideon.png"))]
FIGHTER = [pygame.image.load(os.path.join("assets/image/tie_fighter", "tie_fighter_1.png")),
           pygame.image.load(os.path.join("assets/image/tie_fighter", "tie_fighter_2.png"))]
CLOUD = [pygame.image.load(os.path.join("assets/image/world", "cloud_1.png")),
         pygame.image.load(os.path.join("assets/image/world", "cloud_2.png"))]
HORIZON = pygame.image.load(os.path.join("assets/image/world", "horizon.png"))
GROUND = pygame.image.load(os.path.join("assets/image/world", "ground.png"))

BG = pygame.image.load(os.path.join("assets/image/world", "background.png"))
BG = pygame.transform.scale(BG, (SCREEN_WIDTH, SCREEN_HEIGHT))


class Grogu:
    # класс с персонажем

    def __init__(self):
        # стартовое положение
        self.X_POS = 80
        self.Y_POS = SCREEN_HEIGHT * 0.66
        self.Y_POS_DOWN = SCREEN_HEIGHT * 0.7
        self.JUMP_VEL = 9

        self.down_img = BEND_DOWN
        self.run_img = RUNNING
        self.jump_img = JUMPING

        self.grogu_down = False
        self.grogu_run = True
        self.grogu_jump = False

        self.step_index = 0
        self.jump_vel = self.JUMP_VEL
        self.image = self.run_img[0]
        self.grogu_rect = self.image.get_rect()
        self.grogu_rect.x = self.X_POS
        self.grogu_rect.y = self.Y_POS

    def update(self, user_input):
        # обновление изображения или передвижения персонажа в зависимости от нажатия клавиш
        if self.grogu_down:
            self.down()
        if self.grogu_run:
            self.run()
        if self.grogu_jump:
            self.jump()

        if self.step_index >= 10:
            self.step_index = 0

        if user_input[pygame.K_ESCAPE]:
            sys.exit()
        if (user_input[pygame.K_UP] or user_input[pygame.K_SPACE]) and not self.grogu_jump:
            self.grogu_down = False
            self.grogu_run = False
            self.grogu_jump = True
        elif (user_input[pygame.K_DOWN] or user_input[pygame.K_LCTRL]) and not self.grogu_jump:
            self.grogu_down = True
            self.grogu_run = False
            self.grogu_jump = False
        elif not (self.grogu_jump or (user_input[pygame.K_DOWN] or user_input[pygame.K_LCTRL])):
            self.grogu_down = False
            self.grogu_run = True
            self.grogu_jump = False

    def down(self):
        self.image = self.down_img[self.step_index // 5]
        self.grogu_rect = self.image.get_rect()
        self.grogu_rect.x = self.X_POS
        self.grogu_rect.y = self.Y_POS_DOWN
        self.step_index += 1

    def run(self):
        self.image = self.run_img[self.step_index // 5]
        self.grogu_rect = self.image.get_rect()
        self.grogu_rect.x = self.X_POS
        self.grogu_rect.y = self.Y_POS
        self.step_index += 1

    def jump(self):
        self.image = self.jump_img
        if self.grogu_jump:
            self.grogu_rect.y -= self.jump_vel * 4
            self.jump_vel -= 0.8
        if self.jump_vel < - self.JUMP_VEL:
            self.grogu_jump = False
            self.jump_vel = self.JUMP_VEL

    def draw(self, SCREEN):
        SCREEN.blit(self.image, (self.grogu_rect.x, self.grogu_rect.y))


class Cloud:
    # настройка облаков
    def __init__(self):
        self.x = SCREEN_WIDTH + random.randint(SCREEN_WIDTH - 400, SCREEN_WIDTH - 200)
        self.y = random.randint(50, int(SCREEN_HEIGHT * 0.3))
        self.image = CLOUD[random.randint(0, 1)]
        self.width = self.image.get_width()

    def update(self):
        self.x -= GAME_SPEED
        if self.x < -self.width:
            self.x = SCREEN_WIDTH + random.randint(SCREEN_WIDTH + 1000, SCREEN_WIDTH + 1500)
            self.y = random.randint(50, int(SCREEN_HEIGHT * 0.3))

    def draw(self, SCREEN):
        SCREEN.blit(self.image, (self.x, self.y))


class Obstacle:
    # настройка препятствий
    def __init__(self, image, type):
        self.image = image
        self.type = type
        self.rect = self.image[self.type].get_rect()
        self.rect.x = SCREEN_WIDTH

    def update(self):
        self.rect.x -= GAME_SPEED
        if self.rect.x < -self.rect.width:
            OBSTACLES.pop()

    def draw(self, SCREEN):
        SCREEN.blit(self.image[self.type], self.rect)


class SmallEnemies(Obstacle):
    # рядовые злодеи
    def __init__(self, image):
        self.type = random.randint(0, 1)
        super().__init__(image, self.type)
        self.rect.y = SCREEN_HEIGHT * 0.675


class BigEnemies(Obstacle):
    # главные злодеи
    def __init__(self, image):
        self.type = random.randint(0, 1)
        super().__init__(image, self.type)
        self.rect.y = SCREEN_HEIGHT * 0.65


class Fighter(Obstacle):
    # настройка истребителя
    def __init__(self, image):
        self.type = 0
        super().__init__(image, self.type)
        self.rect.y = SCREEN_HEIGHT * 0.58
        self.index = 0

    def draw(self, SCREEN):
        if self.index >= 9:
            self.index = 0
        SCREEN.blit(self.image[self.index // 5], self.rect)
        self.index += 1


def score():
    # отображение текущего счета в игре
    global POINTS, GAME_SPEED
    font = pygame.font.Font('assets/font/Starjedi.ttf', 30)
    POINTS += 1
    if POINTS % 100 == 0:
        GAME_SPEED += 1
    text = font.render("Points: " + str(POINTS), True, (0, 0, 0))
    text_rect = text.get_rect()
    text_rect.center = (SCREEN_WIDTH - 120, 40)
    SCREEN.blit(text, text_rect)


def background():
    # сборка фона из разных изображений и обновление
    global x_pos_bg, y_pos_bg
    image_width = HORIZON.get_width()
    image_width_2 = GROUND.get_width()
    SCREEN.blit(BG, (0, 0))
    SCREEN.blit(HORIZON, (x_pos_bg, y_pos_bg))
    SCREEN.blit(HORIZON, (image_width + x_pos_bg, y_pos_bg))
    SCREEN.blit(GROUND, (x_pos_bg, y_pos_bg * 1.2))
    SCREEN.blit(GROUND, (image_width_2 + x_pos_bg, y_pos_bg * 1.2))
    if x_pos_bg <= -image_width:
        SCREEN.blit(HORIZON, (image_width + x_pos_bg, y_pos_bg))
        x_pos_bg = 0
    x_pos_bg -= GAME_SPEED


def game():
    # основной процесс игры
    global POINTS, GAME_SPEED, x_pos_bg, y_pos_bg, OBSTACLES
    run = True
    clock = pygame.time.Clock()
    player = Grogu()
    cloud = Cloud()
    x_pos_bg = 0
    y_pos_bg = SCREEN_HEIGHT * 0.6
    GAME_SPEED = 20
    POINTS = 0
    OBSTACLES = []
    death_count = 0
    while run:
        user_input = pygame.key.get_pressed()
        for event in pygame.event.get():
            if event.type == pygame.QUIT or event.type == pygame.K_ESCAPE:
                run = False

        background()
        player.draw(SCREEN)
        player.update(user_input)

        if len(OBSTACLES) == 0:
            if random.randint(0, 2) == 0:
                OBSTACLES.append(SmallEnemies(SMALL_ENEMIES))
            elif random.randint(0, 2) == 1:
                OBSTACLES.append(BigEnemies(BIG_ENEMIES))
            elif random.randint(0, 2) == 2:
                OBSTACLES.append(Fighter(FIGHTER))

        for obstacle in OBSTACLES:
            obstacle.draw(SCREEN)
            obstacle.update()
            if player.grogu_rect.colliderect(obstacle.rect):
                pygame.time.delay(200)
                death_count += 1
                main(death_count)

        cloud.draw(SCREEN)
        cloud.update()
        score()
        clock.tick(30)
        pygame.display.update()


def main(death_count):
    # главный экран
    height_score = int(open('assets/height_score.txt').read())
    run = True
    while run:
        font = pygame.font.Font('assets/font/Starjedi.ttf', 30)
        if death_count == 0:
            text = font.render("Press any Key to Start", True, (0, 0, 0))
            SCREEN.blit(BG, (0, 0))
            SCREEN.blit(HORIZON, (0, SCREEN_HEIGHT * 0.6))
            SCREEN.blit(GROUND, (0, (SCREEN_HEIGHT * 0.6) * 1.2))
            SCREEN.blit(START, (80, SCREEN_HEIGHT * 0.66))
        elif death_count > 0:
            text = font.render("Press any Key to Restart /// escape to exit", True, (0, 0, 0))
            score = font.render("Your Score: " + str(POINTS), True, (0, 0, 0))
            score_rect = score.get_rect()
            score_rect.center = (SCREEN_WIDTH // 2, SCREEN_HEIGHT // 2 + 50)
            SCREEN.blit(BG, (0, 0))
            SCREEN.blit(HORIZON, (0, SCREEN_HEIGHT * 0.6))
            SCREEN.blit(GROUND, (0, (SCREEN_HEIGHT * 0.6) * 1.2))
            SCREEN.blit(DEAD, (80, SCREEN_HEIGHT * 0.66))
            SCREEN.blit(score, score_rect)
            if POINTS > height_score:
                height_score = POINTS
                f = open('assets/height_score.txt', 'w')
                f.write(str(height_score))
                f.close()

        text_rect = text.get_rect()
        text_rect.center = (SCREEN_WIDTH // 2, SCREEN_HEIGHT // 2 - 50)
        win_score = font.render("Height Score: " + str(height_score), True, (0, 0, 0))
        win_score_rect = win_score.get_rect()
        win_score_rect.center = (SCREEN_WIDTH // 2, SCREEN_HEIGHT // 2 + 100)
        SCREEN.blit(text, text_rect)
        SCREEN.blit(win_score, win_score_rect)
        pygame.display.update()
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                run = False
            if event.type == pygame.KEYDOWN:
                game()


if __name__ == '__main__':
    main(death_count=0)
    sys.exit()