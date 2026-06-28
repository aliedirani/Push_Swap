/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   operations_push_bonus.c                            :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: aeldiran <aeldiran@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/12 00:00:00 by aeldiran          #+#    #+#             */
/*   Updated: 2026/04/13 16:16:58 by aeldiran         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

#include "push_swap_bonus.h"

static void	push(t_stack **dst, t_stack **src)
{
	t_stack	*tmp;

	if (!*src)
		return ;
	tmp = *src;
	*src = (*src)->next;
	tmp->next = *dst;
	*dst = tmp;
}

void	pa(t_data *data, int print)
{
	push(&data->a, &data->b);
	if (print)
		ft_putstr_fd("pa\n", 1);
}

void	pb(t_data *data, int print)
{
	push(&data->b, &data->a);
	if (print)
		ft_putstr_fd("pb\n", 1);
}
