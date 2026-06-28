/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   rotate.c                                           :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: aeldiran <aeldiran@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/01/02 20:11:00 by aeldiran          #+#    #+#             */
/*   Updated: 2026/04/13 16:17:56 by aeldiran         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

#include "push_swap.h"

/* Rotate stack up (first becomes last) */
static void	rotate(t_stack **stack)
{
	t_stack	*first;
	t_stack	*last;

	if (!*stack || !(*stack)->next)
		return ;
	first = *stack;
	last = stack_last(*stack);
	*stack = first->next;
	first->next = NULL;
	last->next = first;
}

/* ra: rotate a */
void	ra(t_data *data, int print)
{
	rotate(&data->a);
	if (print)
		ft_putstr_fd("ra\n", 1);
}

/* rb: rotate b */
void	rb(t_data *data, int print)
{
	rotate(&data->b);
	if (print)
		ft_putstr_fd("rb\n", 1);
}

/* rr: rotate both */
void	rr(t_data *data, int print)
{
	rotate(&data->a);
	rotate(&data->b);
	if (print)
		ft_putstr_fd("rr\n", 1);
}
