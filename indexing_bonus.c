/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   indexing_bonus.c                                   :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: aeldiran <aeldiran@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/01/02 21:50:00 by aeldiran          #+#    #+#             */
/*   Updated: 2026/04/13 16:16:49 by aeldiran         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

#include "push_swap_bonus.h"

/* Find minimum value in stack that hasn't been indexed yet */
static int	find_next_min(t_stack *stack)
{
	int		min;
	int		has_min;
	t_stack	*tmp;

	min = 0;
	has_min = 0;
	tmp = stack;
	while (tmp)
	{
		if (tmp->index == -1 && (!has_min || tmp->value < min))
		{
			min = tmp->value;
			has_min = 1;
		}
		tmp = tmp->next;
	}
	return (min);
}

/* Assign index (0 to size-1) to each element based on sorted order */
void	assign_index(t_stack *stack, int size)
{
	t_stack	*tmp;
	int		min;
	int		i;

	i = 0;
	while (i < size)
	{
		tmp = stack;
		min = find_next_min(stack);
		while (tmp)
		{
			if (tmp->value == min && tmp->index == -1)
			{
				tmp->index = i;
				break ;
			}
			tmp = tmp->next;
		}
		i++;
	}
}
