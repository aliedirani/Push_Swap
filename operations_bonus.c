/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   operations_bonus.c                                 :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: aeldiran <aeldiran@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/01/02 21:50:00 by aeldiran          #+#    #+#             */
/*   Updated: 2026/04/13 16:16:56 by aeldiran         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

#include "push_swap_bonus.h"

/* Swap first two elements of a stack */
static void	swap(t_stack **stack)
{
	t_stack	*first;
	t_stack	*second;

	if (!*stack || !(*stack)->next)
		return ;
	first = *stack;
	second = first->next;
	first->next = second->next;
	second->next = first;
	*stack = second;
}

/* sa: swap a */
void	sa(t_data *data, int print)
{
	swap(&data->a);
	if (print)
		ft_putstr_fd("sa\n", 1);
}

/* sb: swap b */
void	sb(t_data *data, int print)
{
	swap(&data->b);
	if (print)
		ft_putstr_fd("sb\n", 1);
}

/* ss: swap both */
void	ss(t_data *data, int print)
{
	swap(&data->a);
	swap(&data->b);
	if (print)
		ft_putstr_fd("ss\n", 1);
}
