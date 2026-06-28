/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   ft_split.c                                         :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: aeldiran <aeldiran@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/01/02 20:13:57 by aeldiran          #+#    #+#             */
/*   Updated: 2026/04/13 16:16:48 by aeldiran         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

#include "push_swap.h"

/* Count words separated by delimiter */
static int	count_words(char const *s, char c)
{
	int	count;
	int	in_word;

	count = 0;
	in_word = 0;
	while (*s)
	{
		if (*s != c && !in_word)
		{
			in_word = 1;
			count++;
		}
		else if (*s == c)
			in_word = 0;
		s++;
	}
	return (count);
}

/* Allocate and copy word */
static char	*get_word(char const *s, char c)
{
	int		len;
	int		i;
	char	*word;

	len = 0;
	while (s[len] && s[len] != c)
		len++;
	word = malloc(sizeof(char) * (len + 1));
	if (!word)
		return (NULL);
	i = 0;
	while (i < len)
	{
		word[i] = s[i];
		i++;
	}
	word[i] = '\0';
	return (word);
}

static int	fill_words(char **result, char const *s, char c)
{
	int	i;

	i = 0;
	while (*s)
	{
		while (*s == c)
			s++;
		if (*s)
		{
			result[i] = get_word(s, c);
			if (!result[i])
				return (free_split(result), -1);
			i++;
			while (*s && *s != c)
				s++;
		}
	}
	return (i);
}

/* Split string by delimiter into array of strings */
char	**ft_split(char const *s, char c)
{
	char	**result;
	int		words;
	int		count;

	if (!s)
		return (NULL);
	words = count_words(s, c);
	result = malloc(sizeof(char *) * (words + 1));
	if (!result)
		return (NULL);
	count = 0;
	while (count <= words)
	{
		result[count] = NULL;
		count++;
	}
	count = fill_words(result, s, c);
	if (count < 0)
		return (NULL);
	result[count] = NULL;
	return (result);
}
