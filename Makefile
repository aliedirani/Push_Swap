# **************************************************************************** #
#                                                                              #
#                                                         :::      ::::::::    #
#    Makefile                                           :+:      :+:    :+:    #
#                                                     +:+ +:+         +:+      #
#    By: aeldiran <aeldiran@student.42bangkok.co    +#+  +:+       +#+         #
#                                                 +#+#+#+#+#+   +#+            #
#    Created: 2026/01/02 20:05:00 by aeldiran          #+#    #+#              #
#    Updated: 2026/01/02 20:05:00 by aeldiran         ###   ########.fr        #
#                                                                              #
# **************************************************************************** #

NAME		= push_swap
BONUS_NAME	= checker

CC		= cc
CFLAGS		= -Wall -Wextra -Werror
ifeq ($(OS),Windows_NT)
RM		= cmd /C del /Q
else
RM		= rm -f
endif

# ---------------------------------------------------------------------------- #
#  Main source files                                                            #
# ---------------------------------------------------------------------------- #

SRCS		= main.c \
		  utils.c \
		  stack_create.c \
		  stack_utils.c \
		  operations.c \
		  operations_push.c \
		  rotate.c \
		  reverse_rotate.c \
		  indexing.c \
		  small_sort.c \
		  small_sort_utils.c \
		  butterfly.c \
		  butterfly_utils.c \
		  butterfly_back.c \
		  ft_split.c \
		  parsing.c

OBJS		= $(SRCS:.c=.o)

# ---------------------------------------------------------------------------- #
#  Bonus source files                                                           #
# ---------------------------------------------------------------------------- #

BONUS_SRCS	= checker_bonus.c \
		  checker_read_bonus.c \
		  checker_exec_bonus.c \
		  utils_bonus.c \
		  stack_create_bonus.c \
		  stack_utils_bonus.c \
		  operations_bonus.c \
		  operations_push_bonus.c \
		  rotate_bonus.c \
		  reverse_rotate_bonus.c \
		  indexing_bonus.c \
		  ft_split_bonus.c \
		  parsing_bonus.c

BONUS_OBJS	= $(BONUS_SRCS:.c=.o)

# ---------------------------------------------------------------------------- #
#  Rules                                                                        #
# ---------------------------------------------------------------------------- #

all: $(NAME)

$(NAME): $(OBJS)
	$(CC) $(CFLAGS) $(OBJS) -o $(NAME)

bonus: $(BONUS_NAME)

$(BONUS_NAME): $(BONUS_OBJS)
	$(CC) $(CFLAGS) $(BONUS_OBJS) -o $(BONUS_NAME)

%.o: %.c push_swap.h
	$(CC) $(CFLAGS) -c $< -o $@

%_bonus.o: %_bonus.c push_swap_bonus.h
	$(CC) $(CFLAGS) -c $< -o $@

checker_bonus.o: checker_bonus.c push_swap_bonus.h
	$(CC) $(CFLAGS) -c $< -o $@

clean:
	$(RM) $(OBJS) $(BONUS_OBJS)

fclean: clean
	$(RM) $(NAME) $(BONUS_NAME)

re: fclean all

.PHONY: all bonus clean fclean re
