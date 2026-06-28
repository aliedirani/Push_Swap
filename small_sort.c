/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   small_sort.c                                       :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: aeldiran <aeldiran@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/01/02 20:11:40 by aeldiran          #+#    #+#             */
/*   Updated: 2026/04/13 16:17:59 by aeldiran         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

#include "push_swap.h"

/* Sort 2 elements */
void	sort_two(t_data *data)
{
	if (data->a->value > data->a->next->value)
		sa(data, 1);
}

void	sort_three(t_data *data)
{
	int	first;
	int	second;
	int	third;

	first = data->a->index;
	second = data->a->next->index;
	third = data->a->next->next->index;
	if (first > second && second < third && first < third)
		sa(data, 1);
	else if (first > second && second > third)
	{
		sa(data, 1);
		rra(data, 1);
	}
	else if (first > second && second < third && first > third)
		ra(data, 1);
	else if (first < second && second > third && first < third)
	{
		sa(data, 1);
		ra(data, 1);
	}
	else if (first < second && second > third && first > third)
		rra(data, 1);
}
