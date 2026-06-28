/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   reverse_rotate_bonus.c                             :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: aeldiran <aeldiran@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/12 00:00:00 by aeldiran          #+#    #+#             */
/*   Updated: 2026/04/13 16:17:51 by aeldiran         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

#include "push_swap_bonus.h"

static void	reverse_rotate(t_stack **stack)
{
	t_stack	*current;
	t_stack	*last;

	if (!*stack || !(*stack)->next)
		return ;
	current = *stack;
	while (current->next->next)
		current = current->next;
	last = current->next;
	current->next = NULL;
	last->next = *stack;
	*stack = last;
}

void	rra(t_data *data, int print)
{
	reverse_rotate(&data->a);
	if (print)
		ft_putstr_fd("rra\n", 1);
}

void	rrb(t_data *data, int print)
{
	reverse_rotate(&data->b);
	if (print)
		ft_putstr_fd("rrb\n", 1);
}

void	rrr(t_data *data, int print)
{
	reverse_rotate(&data->a);
	reverse_rotate(&data->b);
	if (print)
		ft_putstr_fd("rrr\n", 1);
}
