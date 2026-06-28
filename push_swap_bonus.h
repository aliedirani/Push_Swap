/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   push_swap_bonus.h                                  :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: aeldiran <aeldiran@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/01/02 21:46:18 by aeldiran          #+#    #+#             */
/*   Updated: 2026/04/13 16:17:10 by aeldiran         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

#ifndef PUSH_SWAP_BONUS_H
# define PUSH_SWAP_BONUS_H

# include <unistd.h>
# include <stdlib.h>
# include <limits.h>

/* Stack node */
typedef struct s_stack
{
	int				value;
	int				index;
	struct s_stack	*next;
}	t_stack;

/* Program state */
typedef struct s_data
{
	t_stack	*a;
	t_stack	*b;
	int		size;
}	t_data;

/* ============ PARSING & VALIDATION ============ */
int		is_valid_number(char *str);
int		has_duplicates(t_stack *stack);
int		is_sorted(t_stack *stack);
void	parse_arguments(int ac, char **av, t_data *data);
char	**ft_split(char const *s, char c);

/* ============ STACK OPERATIONS ============ */
void	pa(t_data *data, int print);
void	pb(t_data *data, int print);
void	sa(t_data *data, int print);
void	sb(t_data *data, int print);
void	ss(t_data *data, int print);
void	ra(t_data *data, int print);
void	rb(t_data *data, int print);
void	rr(t_data *data, int print);
void	rra(t_data *data, int print);
void	rrb(t_data *data, int print);
void	rrr(t_data *data, int print);

/* ============ STACK UTILS ============ */
t_stack	*stack_new(int value);
void	stack_add_back(t_stack **stack, t_stack *new);
int		stack_size(t_stack *stack);
t_stack	*stack_last(t_stack *stack);
void	stack_clear(t_stack **stack);

/* ============ INDEXING ============ */
void	assign_index(t_stack *stack, int size);

/* ============ UTILS ============ */
void	error_exit(t_data *data);
void	free_split(char **split);
long	ft_atoi(const char *str);
void	ft_putstr_fd(char *s, int fd);
char	*checker_get_line(int fd);
int		checker_execute(t_data *data, char *line);

#endif
